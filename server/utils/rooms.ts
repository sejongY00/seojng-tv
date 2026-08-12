export function getMaxRoomMembers() {
  return useRuntimeConfig().maxRoomMembers || 8
}

export function getMaxConcurrentStreams() {
  return useRuntimeConfig().maxConcurrentStreams || 4
}
