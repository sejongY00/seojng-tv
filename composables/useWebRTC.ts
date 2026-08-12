import type { AppSocket } from './useSocket'
import { iceSummary, rtcLog, rtcWarn } from '~/utils/rtcLog'

type PeerKey = string

function peerKey(remoteId: string, streamId: string) {
  return `${remoteId}:${streamId}`
}

/** WebRTC defaults cap screen share near 2.5 Mbps, which looks soft at 1080p60. */
const MAX_VIDEO_BITRATE = 12_000_000

export function useWebRTC(options: {
  socket: Ref<AppSocket | null>
  clientId: Ref<string>
  getLocalStream: () => MediaStream | null
}) {
  const peers = new Map<PeerKey, RTCPeerConnection>()
  const remoteStreams = ref<Record<string, MediaStream>>({})
  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

  async function applySenderQuality(pc: RTCPeerConnection, key: string) {
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== 'video') continue
      const params = sender.getParameters()
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}]
      }
      params.encodings[0]!.maxBitrate = MAX_VIDEO_BITRATE
      params.encodings[0]!.maxFramerate = 60
      params.degradationPreference = 'maintain-framerate'
      try {
        await sender.setParameters(params)
        rtcLog('sender:quality', { key, maxBitrate: MAX_VIDEO_BITRATE, maxFramerate: 60 })
      } catch (e) {
        rtcWarn('sender:setParameters failed', { key, err: String(e) })
      }
    }
  }

  function getPc(remoteId: string, streamId: string) {
    const key = peerKey(remoteId, streamId)
    let pc = peers.get(key)
    if (pc) return pc

    rtcLog('pc:create', { key, iceServers })
    pc = new RTCPeerConnection({ iceServers })
    peers.set(key, pc)

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !options.socket.value) {
        if (!ev.candidate) rtcLog('ice:local gathering done', { key })
        return
      }
      rtcLog('ice:local', { key, ...iceSummary(ev.candidate.toJSON()) })
      options.socket.value.emit('webrtc:ice', {
        to: remoteId,
        streamId,
        candidate: ev.candidate.toJSON(),
      })
    }

    pc.oniceconnectionstatechange = () => {
      rtcLog('ice:state', { key, state: pc?.iceConnectionState })
      if (pc?.iceConnectionState === 'failed') {
        rtcWarn('ice:FAILED — same-LAN check firewall/AP isolation; else need TURN', { key })
      }
    }

    pc.onconnectionstatechange = () => {
      rtcLog('pc:state', { key, state: pc?.connectionState })
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        closePeer(remoteId, streamId)
      }
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track])
      rtcLog('track:remote', {
        key,
        kind: ev.track.kind,
        id: ev.track.id,
        muted: ev.track.muted,
        readyState: ev.track.readyState,
        streamTracks: stream.getTracks().map((t) => t.kind),
      })
      remoteStreams.value = { ...remoteStreams.value, [streamId]: stream }
    }

    return pc
  }

  function closePeer(remoteId: string, streamId: string) {
    const key = peerKey(remoteId, streamId)
    const pc = peers.get(key)
    if (pc) {
      rtcLog('pc:close', { key })
      pc.close()
      peers.delete(key)
    }
    if (remoteStreams.value[streamId]) {
      const next = { ...remoteStreams.value }
      delete next[streamId]
      remoteStreams.value = next
    }
  }

  function closeAll() {
    rtcLog('pc:closeAll', { count: peers.size })
    for (const pc of peers.values()) pc.close()
    peers.clear()
    remoteStreams.value = {}
  }

  async function createOfferAsViewer(broadcasterId: string, streamId: string) {
    const pc = getPc(broadcasterId, streamId)
    if (pc.getTransceivers().length === 0) {
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    rtcLog('offer:send', {
      to: broadcasterId,
      streamId,
      mLines: (offer.sdp?.match(/^m=/gm) || []).length,
    })
    options.socket.value?.emit('webrtc:offer', {
      to: broadcasterId,
      streamId,
      sdp: offer,
    })
  }

  async function handleOffer(from: string, streamId: string, sdp: RTCSessionDescriptionInit) {
    const pc = getPc(from, streamId)
    rtcLog('offer:recv', {
      from,
      streamId,
      mLines: (sdp.sdp?.match(/^m=/gm) || []).length,
      hasLocalStream: Boolean(options.getLocalStream()),
      localTracks: options.getLocalStream()?.getTracks().map((t) => t.kind) || [],
    })
    await pc.setRemoteDescription(sdp)
    const local = options.getLocalStream()
    if (local) {
      for (const track of local.getTracks()) {
        const exists = pc.getSenders().some((s) => s.track?.id === track.id)
        if (!exists) {
          pc.addTrack(track, local)
          rtcLog('track:add local', { to: from, streamId, kind: track.kind })
        }
      }
    } else {
      rtcWarn('offer:recv but no local MediaStream to send', { from, streamId })
    }
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await applySenderQuality(pc, peerKey(from, streamId))
    rtcLog('answer:send', {
      to: from,
      streamId,
      mLines: (answer.sdp?.match(/^m=/gm) || []).length,
    })
    options.socket.value?.emit('webrtc:answer', {
      to: from,
      streamId,
      sdp: answer,
    })
  }

  async function handleAnswer(from: string, streamId: string, sdp: RTCSessionDescriptionInit) {
    const pc = peers.get(peerKey(from, streamId))
    if (!pc) {
      rtcWarn('answer:recv but no PC', { from, streamId })
      return
    }
    rtcLog('answer:recv', {
      from,
      streamId,
      mLines: (sdp.sdp?.match(/^m=/gm) || []).length,
    })
    await pc.setRemoteDescription(sdp)
  }

  async function handleIce(from: string, streamId: string, candidate: RTCIceCandidateInit) {
    const pc = peers.get(peerKey(from, streamId))
    if (!pc) return
    rtcLog('ice:remote', { from, streamId, ...iceSummary(candidate) })
    try {
      await pc.addIceCandidate(candidate)
    } catch (e) {
      rtcWarn('ice:add failed', { from, streamId, err: String(e) })
    }
  }

  function attachLocalTracksToPeer(remoteId: string, streamId: string) {
    const local = options.getLocalStream()
    if (!local) return
    const pc = getPc(remoteId, streamId)
    for (const track of local.getTracks()) {
      const exists = pc.getSenders().some((s) => s.track?.id === track.id)
      if (!exists) pc.addTrack(track, local)
    }
  }

  function bindSocketHandlers() {
    const s = options.socket.value
    if (!s) return
    rtcLog('socket:bind webrtc handlers', { clientId: options.clientId.value })

    s.on('webrtc:offer', async (payload) => {
      if (!payload.from || !payload.sdp || !payload.streamId) return
      await handleOffer(payload.from, payload.streamId, payload.sdp)
    })

    s.on('webrtc:answer', async (payload) => {
      if (!payload.from || !payload.sdp || !payload.streamId) return
      await handleAnswer(payload.from, payload.streamId, payload.sdp)
    })

    s.on('webrtc:ice', async (payload) => {
      if (!payload.from || !payload.candidate || !payload.streamId) return
      await handleIce(payload.from, payload.streamId, payload.candidate)
    })

    s.on('peer:left', (payload) => {
      rtcLog('peer:left', payload)
      for (const key of [...peers.keys()]) {
        if (key.startsWith(`${payload.clientId}:`)) {
          const streamId = key.split(':')[1]
          closePeer(payload.clientId, streamId)
        }
      }
    })
  }

  return {
    remoteStreams,
    createOfferAsViewer,
    attachLocalTracksToPeer,
    closePeer,
    closeAll,
    bindSocketHandlers,
  }
}
