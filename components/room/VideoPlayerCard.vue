<script setup lang="ts">
const props = defineProps<{
  streamId: string
  title: string
  mediaStream: MediaStream | null
  startedAt: number
  viewerNames: string[]
  volume: number
  muted: boolean
  focused?: boolean
}>()

const emit = defineEmits<{
  'update:volume': [value: number]
  'update:muted': [value: boolean]
  stop: []
  focus: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const { formatted } = useRoomTimer(() => props.startedAt)

watch(
  () => props.mediaStream,
  (stream) => {
    const el = videoRef.value
    if (!el) return
    el.srcObject = stream
    el.play().catch(() => {})
  },
  { immediate: true },
)

watch(
  () => [props.volume, props.muted] as const,
  ([volume, muted]) => {
    const el = videoRef.value
    if (!el) return
    el.volume = volume
    el.muted = muted
  },
  { immediate: true },
)

onMounted(() => {
  const el = videoRef.value
  if (el && props.mediaStream) {
    el.srcObject = props.mediaStream
    el.volume = props.volume
    el.muted = props.muted
    el.play().catch(() => {})
  }
})
</script>

<template>
  <article
    class="flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-black/40"
    :class="focused ? 'ring-2 ring-[var(--accent)]' : ''"
  >
    <div class="relative aspect-video bg-black" @dblclick="emit('focus')">
      <video ref="videoRef" class="h-full w-full object-contain" autoplay playsinline />
      <div class="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs">
        {{ title }} · {{ formatted }}
      </div>
      <div
        v-if="viewerNames.length"
        class="pointer-events-none absolute bottom-2 left-2 max-w-[80%] truncate rounded bg-black/60 px-2 py-1 text-[11px] text-[var(--text-muted)]"
      >
        시청: {{ viewerNames.join(', ') }}
      </div>
    </div>
    <div class="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2">
      <button
        type="button"
        class="btn-ghost !px-2 !py-1 text-xs"
        @click="emit('update:muted', !muted)"
      >
        {{ muted ? '음소거됨' : '소리' }}
      </button>
      <input
        class="flex-1 accent-[var(--accent)]"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        :disabled="muted"
        @input="emit('update:volume', Number(($event.target as HTMLInputElement).value))"
      />
      <span class="w-10 text-right text-xs text-[var(--text-muted)]">{{ Math.round(volume * 100) }}%</span>
      <button type="button" class="btn-ghost !px-2 !py-1 text-xs" @click="emit('stop')">종료</button>
    </div>
  </article>
</template>
