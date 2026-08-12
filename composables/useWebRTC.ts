import type { AppSocket } from './useSocket'

type PeerKey = string

function peerKey(remoteId: string, streamId: string) {
  return `${remoteId}:${streamId}`
}

export function useWebRTC(options: {
  socket: Ref<AppSocket | null>
  clientId: Ref<string>
  getLocalStream: () => MediaStream | null
}) {
  const peers = new Map<PeerKey, RTCPeerConnection>()
  const remoteStreams = ref<Record<string, MediaStream>>({})
  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

  function getPc(remoteId: string, streamId: string) {
    const key = peerKey(remoteId, streamId)
    let pc = peers.get(key)
    if (pc) return pc

    pc = new RTCPeerConnection({ iceServers })
    peers.set(key, pc)

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !options.socket.value) return
      options.socket.value.emit('webrtc:ice', {
        to: remoteId,
        streamId,
        candidate: ev.candidate.toJSON(),
      })
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track])
      remoteStreams.value = { ...remoteStreams.value, [streamId]: stream }
    }

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'closed') {
        closePeer(remoteId, streamId)
      }
    }

    return pc
  }

  function closePeer(remoteId: string, streamId: string) {
    const key = peerKey(remoteId, streamId)
    const pc = peers.get(key)
    if (pc) {
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
    for (const pc of peers.values()) pc.close()
    peers.clear()
    remoteStreams.value = {}
  }

  async function createOfferAsViewer(broadcasterId: string, streamId: string) {
    const pc = getPc(broadcasterId, streamId)
    // Without recvonly transceivers the offer carries no m-lines and no media can flow back.
    if (pc.getTransceivers().length === 0) {
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    options.socket.value?.emit('webrtc:offer', {
      to: broadcasterId,
      streamId,
      sdp: offer,
    })
  }

  async function handleOffer(from: string, streamId: string, sdp: RTCSessionDescriptionInit) {
    const pc = getPc(from, streamId)
    // Set the remote offer first so addTrack reuses the viewer's recvonly transceivers.
    await pc.setRemoteDescription(sdp)
    const local = options.getLocalStream()
    if (local) {
      for (const track of local.getTracks()) {
        const exists = pc.getSenders().some((s) => s.track?.id === track.id)
        if (!exists) pc.addTrack(track, local)
      }
    }
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    options.socket.value?.emit('webrtc:answer', {
      to: from,
      streamId,
      sdp: answer,
    })
  }

  async function handleAnswer(from: string, streamId: string, sdp: RTCSessionDescriptionInit) {
    const pc = peers.get(peerKey(from, streamId))
    if (!pc) return
    await pc.setRemoteDescription(sdp)
  }

  async function handleIce(from: string, streamId: string, candidate: RTCIceCandidateInit) {
    const pc = peers.get(peerKey(from, streamId))
    if (!pc) return
    try {
      await pc.addIceCandidate(candidate)
    } catch {
      // ignore late candidates
    }
  }

  /** Broadcaster: when a viewer starts watching, wait for their offer (viewer-initiated). */
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
