import type { ActiveStream, Participant, RoomState, WatchMap } from '~/types/room'
import type { Server } from 'socket.io'

export interface RoomSession {
  clientId: string
  socketId: string
  nickname: string
  joinedAt: number
  streamId: string | null
}

export interface RuntimeRoom {
  roomId: string
  sessions: Map<string, RoomSession>
  streams: Map<string, ActiveStream>
  /** viewerClientId -> Set<streamId> */
  watchMap: Map<string, Set<string>>
}

const rooms = new Map<string, RuntimeRoom>()
let ioRef: Server | null = null

export function setIO(io: Server) {
  ioRef = io
}

export function getIO() {
  return ioRef
}

export function getOrCreateRuntimeRoom(roomId: string): RuntimeRoom {
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      roomId,
      sessions: new Map(),
      streams: new Map(),
      watchMap: new Map(),
    }
    rooms.set(roomId, room)
  }
  return room
}

export function getRuntimeRoom(roomId: string) {
  return rooms.get(roomId)
}

export function deleteRuntimeRoom(roomId: string) {
  rooms.delete(roomId)
}

export function serializeWatchMap(room: RuntimeRoom): WatchMap {
  const out: WatchMap = {}
  for (const [viewerId, streamIds] of room.watchMap) {
    out[viewerId] = [...streamIds]
  }
  return out
}

export function buildRoomState(room: RuntimeRoom): RoomState {
  const participants: Participant[] = [...room.sessions.values()].map((s) => ({
    clientId: s.clientId,
    nickname: s.nickname,
    joinedAt: s.joinedAt,
    isStreaming: Boolean(s.streamId),
  }))

  return {
    roomId: room.roomId,
    participants,
    activeStreams: [...room.streams.values()],
    watchMap: serializeWatchMap(room),
  }
}

export function broadcastRoomState(roomId: string) {
  const room = rooms.get(roomId)
  const io = ioRef
  if (!room || !io) return
  io.to(roomId).emit('room:state', buildRoomState(room))
}

export function forceCloseRoom(roomId: string, reason = 'Room deleted') {
  const io = ioRef
  if (io) {
    io.to(roomId).emit('room:force-close', { reason })
    io.in(roomId).disconnectSockets(true)
  }
  deleteRuntimeRoom(roomId)
}

export function removeViewerWatches(room: RuntimeRoom, clientId: string) {
  room.watchMap.delete(clientId)
  for (const [, set] of room.watchMap) {
    // no-op for stream ownership
  }
}

export function stopStreamsByClient(room: RuntimeRoom, clientId: string) {
  const session = room.sessions.get(clientId)
  if (session?.streamId) {
    room.streams.delete(session.streamId)
    for (const [, set] of room.watchMap) {
      set.delete(session.streamId)
    }
    session.streamId = null
  }
}

export function getMemberCount(roomId: string) {
  return rooms.get(roomId)?.sessions.size ?? 0
}

export function getStreamCount(roomId: string) {
  return rooms.get(roomId)?.streams.size ?? 0
}
