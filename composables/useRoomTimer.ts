import { useTimestamp } from '@vueuse/core'

export function useRoomTimer(startedAt: MaybeRefOrGetter<number | null>) {
  const now = useTimestamp({ interval: 1000 })

  const elapsedMs = computed(() => {
    const start = toValue(startedAt)
    if (!start) return 0
    return Math.max(0, now.value - start)
  })

  const formatted = computed(() => formatDuration(elapsedMs.value))

  return { elapsedMs, formatted }
}

export function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
