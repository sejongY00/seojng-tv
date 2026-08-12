import { defineStore } from 'pinia'
import type { ActiveStream, Participant, RoomState, WatchMap } from '~/types/room'

export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const roomName = ref('')
  const joined = ref(false)
  const joinedAt = ref<number | null>(null)
  const participants = ref<Participant[]>([])
  const activeStreams = ref<ActiveStream[]>([])
  const watchMap = ref<WatchMap>({})
  const watchingStreamIds = ref<string[]>([])
  const layoutMode = ref<'grid' | 'focus'>('grid')
  const focusStreamId = ref<string | null>(null)
  const volumeMap = ref<Record<string, number>>({})
  const mutedMap = ref<Record<string, boolean>>({})
  const error = ref<string | null>(null)

  function applyState(state: RoomState) {
    roomId.value = state.roomId
    participants.value = state.participants
    activeStreams.value = state.activeStreams
    watchMap.value = state.watchMap
  }

  function setWatching(streamId: string, on: boolean) {
    const set = new Set(watchingStreamIds.value)
    if (on) set.add(streamId)
    else set.delete(streamId)
    watchingStreamIds.value = [...set]
    if (!on && focusStreamId.value === streamId) {
      focusStreamId.value = watchingStreamIds.value[0] || null
    }
  }

  function ensureAudioDefaults(streamId: string) {
    if (volumeMap.value[streamId] === undefined) {
      volumeMap.value = { ...volumeMap.value, [streamId]: 1 }
    }
    if (mutedMap.value[streamId] === undefined) {
      mutedMap.value = { ...mutedMap.value, [streamId]: false }
    }
  }

  function reset() {
    joined.value = false
    joinedAt.value = null
    participants.value = []
    activeStreams.value = []
    watchMap.value = {}
    watchingStreamIds.value = []
    focusStreamId.value = null
    error.value = null
  }

  const viewersOfStream = computed(() => {
    const map: Record<string, string[]> = {}
    for (const [viewerId, streamIds] of Object.entries(watchMap.value)) {
      for (const sid of streamIds) {
        if (!map[sid]) map[sid] = []
        map[sid].push(viewerId)
      }
    }
    return map
  })

  return {
    roomId,
    roomName,
    joined,
    joinedAt,
    participants,
    activeStreams,
    watchMap,
    watchingStreamIds,
    layoutMode,
    focusStreamId,
    volumeMap,
    mutedMap,
    error,
    viewersOfStream,
    applyState,
    setWatching,
    ensureAudioDefaults,
    reset,
  }
})
