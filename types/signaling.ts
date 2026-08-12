export interface JoinPayload {
  roomId: string
  clientId: string
  nickname: string
  accessToken: string
}

export interface StreamStartPayload {
  streamId: string
}

export interface StreamStopPayload {
  streamId: string
}

export interface WatchPayload {
  streamId: string
  broadcasterId: string
}

export interface SignalPayload {
  to: string
  from?: string
  streamId: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export type ClientToServerEvents = {
  'room:join': (payload: JoinPayload, ack?: (res: { ok: boolean; error?: string }) => void) => void
  'room:leave': () => void
  'stream:start': (payload: StreamStartPayload, ack?: (res: { ok: boolean; error?: string }) => void) => void
  'stream:stop': (payload: StreamStopPayload) => void
  'watch:start': (payload: WatchPayload) => void
  'watch:stop': (payload: WatchPayload) => void
  'webrtc:offer': (payload: SignalPayload) => void
  'webrtc:answer': (payload: SignalPayload) => void
  'webrtc:ice': (payload: SignalPayload) => void
}

export type ServerToClientEvents = {
  'room:state': (state: import('./room').RoomState) => void
  'room:force-close': (payload: { reason: string }) => void
  'room:error': (payload: { error: string }) => void
  'webrtc:offer': (payload: SignalPayload) => void
  'webrtc:answer': (payload: SignalPayload) => void
  'webrtc:ice': (payload: SignalPayload) => void
  'peer:left': (payload: { clientId: string }) => void
}
