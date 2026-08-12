<script setup lang="ts">
import type { ActiveStream } from '~/types/room'

const props = defineProps<{
  streams: ActiveStream[]
  remoteStreams: Record<string, MediaStream>
  localPreview?: { streamId: string; stream: MediaStream; title: string; startedAt: number } | null
  layoutMode: 'grid' | 'focus'
  focusStreamId: string | null
  volumeMap: Record<string, number>
  mutedMap: Record<string, boolean>
  viewerNamesByStream: Record<string, string[]>
}>()

const emit = defineEmits<{
  'update:volume': [streamId: string, value: number]
  'update:muted': [streamId: string, value: boolean]
  stop: [streamId: string]
  focus: [streamId: string]
}>()

const cards = computed(() => {
  const list: Array<{
    streamId: string
    title: string
    mediaStream: MediaStream | null
    startedAt: number
    isLocal?: boolean
  }> = []

  if (props.localPreview) {
    list.push({
      streamId: props.localPreview.streamId,
      title: props.localPreview.title,
      mediaStream: props.localPreview.stream,
      startedAt: props.localPreview.startedAt,
      isLocal: true,
    })
  }

  for (const s of props.streams) {
    if (props.localPreview?.streamId === s.streamId) continue
    list.push({
      streamId: s.streamId,
      title: s.broadcasterNickname,
      mediaStream: props.remoteStreams[s.streamId] || null,
      startedAt: s.startedAt,
    })
  }

  if (props.layoutMode === 'focus' && props.focusStreamId) {
    return [...list].sort((a, b) => {
      if (a.streamId === props.focusStreamId) return -1
      if (b.streamId === props.focusStreamId) return 1
      return 0
    })
  }
  return list
})

// Cells stretch to the available height; the video letterboxes itself with object-contain,
// so the aspect ratio is kept without forcing the page to scroll.
const base = 'grid h-full min-h-0 gap-3 auto-rows-[minmax(220px,1fr)]'

const gridClass = computed(() => {
  if (props.layoutMode === 'focus') {
    return `${base} grid-cols-1 lg:grid-cols-4 lg:grid-rows-3`
  }
  const n = cards.value.length
  if (n <= 1) return `${base} grid-cols-1`
  if (n === 2) return `${base} grid-cols-1 md:grid-cols-2`
  if (n <= 4) return `${base} grid-cols-1 md:grid-cols-2`
  return `${base} grid-cols-1 md:grid-cols-2 xl:grid-cols-3`
})
</script>

<template>
  <div :class="gridClass">
    <RoomVideoPlayerCard
      v-for="(card, index) in cards"
      :key="card.streamId"
      :class="layoutMode === 'focus' && index === 0 ? 'lg:col-span-3 lg:row-span-3' : ''"
      :stream-id="card.streamId"
      :title="card.isLocal ? `${card.title} (미리보기)` : card.title"
      :media-stream="card.mediaStream"
      :started-at="card.startedAt"
      :viewer-names="viewerNamesByStream[card.streamId] || []"
      :volume="volumeMap[card.streamId] ?? 1"
      :muted="mutedMap[card.streamId] ?? false"
      :focused="layoutMode === 'focus' ? index === 0 : focusStreamId === card.streamId"
      @update:volume="emit('update:volume', card.streamId, $event)"
      @update:muted="emit('update:muted', card.streamId, $event)"
      @stop="emit('stop', card.streamId)"
      @focus="emit('focus', card.streamId)"
    />
    <div
      v-if="!cards.length"
      class="flex items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]"
    >
      시청할 화면을 왼쪽에서 선택하세요.
    </div>
  </div>
</template>
