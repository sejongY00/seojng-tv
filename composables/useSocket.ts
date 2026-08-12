import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '~/types/signaling'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socketSingleton: AppSocket | null = null

export function useSocket() {
  const socket = useState<AppSocket | null>('app-socket', () => null)

  function connect() {
    if (!import.meta.client) return null
    if (socketSingleton?.connected) {
      socket.value = socketSingleton
      return socketSingleton
    }
    socketSingleton = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
    socket.value = socketSingleton
    return socketSingleton
  }

  function disconnect() {
    socketSingleton?.disconnect()
    socketSingleton = null
    socket.value = null
  }

  return { socket, connect, disconnect }
}
