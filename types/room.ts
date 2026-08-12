export interface RoomPublic {
  id: string
  name: string
  createdAt?: string
  memberCount?: number
  streamCount?: number
}

export interface RoomAdmin extends RoomPublic {
  pwdVersion: number
  createdBy: string
}

export interface Participant {
  clientId: string
  nickname: string
  joinedAt: number
  isStreaming: boolean
}

export interface ActiveStream {
  streamId: string
  broadcasterId: string
  broadcasterNickname: string
  startedAt: number
}

/** viewerClientId -> Set of streamIds (serialized as Record) */
export type WatchMap = Record<string, string[]>

export interface RoomState {
  roomId: string
  participants: Participant[]
  activeStreams: ActiveStream[]
  watchMap: WatchMap
}
