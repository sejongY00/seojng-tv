import type { NitroApp } from 'nitropack'
import { Server as Engine } from 'engine.io'
import { Server } from 'socket.io'
import { defineEventHandler } from 'h3'
import { prisma } from '../utils/db'
import { verifyRoomAccessToken } from '../utils/roomAccess'
import { getMaxConcurrentStreams, getMaxRoomMembers } from '../utils/rooms'
import {
  broadcastRoomState,
  buildRoomState,
  getOrCreateRuntimeRoom,
  removeViewerWatches,
  setIO,
  stopStreamsByClient,
  type RoomSession,
} from '../utils/runtimeRooms'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const engine = new Engine()
  const io = new Server({
    cors: { origin: true, credentials: true },
    path: '/socket.io/',
  })
  io.bind(engine)
  setIO(io)

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null
    let currentClientId: string | null = null

    const cleanup = () => {
      if (!currentRoomId || !currentClientId) return
      const room = getOrCreateRuntimeRoom(currentRoomId)
      const session = room.sessions.get(currentClientId)
      if (session && session.socketId === socket.id) {
        stopStreamsByClient(room, currentClientId)
        removeViewerWatches(room, currentClientId)
        room.sessions.delete(currentClientId)
        io.to(currentRoomId).emit('peer:left', { clientId: currentClientId })
        broadcastRoomState(currentRoomId)
        if (room.sessions.size === 0) {
          // keep empty runtime room until deleted from DB; optional cleanup
        }
      }
      currentRoomId = null
      currentClientId = null
    }

    socket.on('room:join', async (payload, ack) => {
      try {
        const { roomId, clientId, nickname, accessToken } = payload || {}
        if (!roomId || !clientId || !nickname?.trim() || !accessToken) {
          ack?.({ ok: false, error: 'Invalid join payload' })
          return
        }

        const dbRoom = await prisma.room.findUnique({ where: { id: roomId } })
        if (!dbRoom) {
          ack?.({ ok: false, error: 'Room not found' })
          return
        }

        await verifyRoomAccessToken(accessToken, {
          roomId,
          clientId,
          pwdVersion: dbRoom.pwdVersion,
        })

        if (currentRoomId && currentClientId) {
          cleanup()
        }

        const room = getOrCreateRuntimeRoom(roomId)
        const existing = room.sessions.get(clientId)
        if (existing && existing.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existing.socketId)
          oldSocket?.emit('room:force-close', { reason: 'Replaced by new session' })
          oldSocket?.disconnect(true)
          stopStreamsByClient(room, clientId)
          removeViewerWatches(room, clientId)
          room.sessions.delete(clientId)
        }

        const maxMembers = getMaxRoomMembers()
        if (!room.sessions.has(clientId) && room.sessions.size >= maxMembers) {
          ack?.({ ok: false, error: `Room is full (max ${maxMembers})` })
          return
        }

        const session: RoomSession = {
          clientId,
          socketId: socket.id,
          nickname: nickname.trim().slice(0, 32),
          joinedAt: Date.now(),
          streamId: null,
        }
        room.sessions.set(clientId, session)
        currentRoomId = roomId
        currentClientId = clientId
        socket.join(roomId)

        ack?.({ ok: true })
        socket.emit('room:state', buildRoomState(room))
        broadcastRoomState(roomId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Join failed'
        ack?.({ ok: false, error: message })
      }
    })

    socket.on('room:leave', () => {
      socket.leave(currentRoomId || '')
      cleanup()
    })

    socket.on('stream:start', (payload, ack) => {
      if (!currentRoomId || !currentClientId) {
        ack?.({ ok: false, error: 'Not in a room' })
        return
      }
      const room = getOrCreateRuntimeRoom(currentRoomId)
      const session = room.sessions.get(currentClientId)
      if (!session) {
        ack?.({ ok: false, error: 'Session missing' })
        return
      }
      if (session.streamId) {
        ack?.({ ok: false, error: 'Already streaming' })
        return
      }
      const maxStreams = getMaxConcurrentStreams()
      if (room.streams.size >= maxStreams) {
        ack?.({ ok: false, error: `Max concurrent streams is ${maxStreams}` })
        return
      }
      const streamId = payload?.streamId || `${currentClientId}-${Date.now()}`
      session.streamId = streamId
      room.streams.set(streamId, {
        streamId,
        broadcasterId: currentClientId,
        broadcasterNickname: session.nickname,
        startedAt: Date.now(),
      })
      ack?.({ ok: true })
      broadcastRoomState(currentRoomId)
    })

    socket.on('stream:stop', (payload) => {
      if (!currentRoomId || !currentClientId) return
      const room = getOrCreateRuntimeRoom(currentRoomId)
      const session = room.sessions.get(currentClientId)
      const streamId = payload?.streamId || session?.streamId
      if (!streamId) return
      room.streams.delete(streamId)
      if (session?.streamId === streamId) session.streamId = null
      for (const set of room.watchMap.values()) {
        set.delete(streamId)
      }
      broadcastRoomState(currentRoomId)
    })

    socket.on('watch:start', (payload) => {
      if (!currentRoomId || !currentClientId || !payload?.streamId) return
      const room = getOrCreateRuntimeRoom(currentRoomId)
      if (!room.streams.has(payload.streamId)) return
      let set = room.watchMap.get(currentClientId)
      if (!set) {
        set = new Set()
        room.watchMap.set(currentClientId, set)
      }
      set.add(payload.streamId)
      broadcastRoomState(currentRoomId)
    })

    socket.on('watch:stop', (payload) => {
      if (!currentRoomId || !currentClientId || !payload?.streamId) return
      const room = getOrCreateRuntimeRoom(currentRoomId)
      room.watchMap.get(currentClientId)?.delete(payload.streamId)
      broadcastRoomState(currentRoomId)
    })

    const relay = (eventName: 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice') => {
      socket.on(eventName, (payload) => {
        if (!currentRoomId || !currentClientId || !payload?.to) return
        const room = getOrCreateRuntimeRoom(currentRoomId)
        const target = room.sessions.get(payload.to)
        if (!target) return
        io.to(target.socketId).emit(eventName, {
          ...payload,
          from: currentClientId,
        })
      })
    }
    relay('webrtc:offer')
    relay('webrtc:answer')
    relay('webrtc:ice')

    socket.on('disconnect', () => {
      cleanup()
    })
  })

  nitroApp.router.use(
    '/socket.io/',
    defineEventHandler({
      handler(event) {
        engine.handleRequest(event.node.req, event.node.res)
        event._handled = true
      },
      websocket: {
        open(peer) {
          // @ts-expect-error engine.io peer bridge
          engine.prepare(peer._internal.nodeReq)
          // @ts-expect-error engine.io peer bridge
          engine.onWebSocket(peer._internal.nodeReq, peer._internal.nodeReq.socket, peer.websocket)
        },
      },
    }),
  )
})
