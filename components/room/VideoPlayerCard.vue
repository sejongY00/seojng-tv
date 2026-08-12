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

const dvrEnabled = computed(() => Boolean(props.focused && props.mediaStream))

const {
  delayLabel,
  isLive,
  canSeekBack,
  canSeekForward,
  bufferMs,
  recording,
  error: dvrError,
  seekBack,
  seekForward,
  goLive,
  SEEK_STEP_MS,
} = useStreamDvr({
  enabled: dvrEnabled,
  stream: () => props.mediaStream,
  videoRef,
})

const bufferReadySec = computed(() => Math.floor(bufferMs.value / 1000))

function attachLiveStream(stream: MediaStream | null) {
  const el = videoRef.value
  if (!el) return
  el.srcObject = stream
  if (stream) el.play().catch(() => {})
}

watch(
  () => [props.mediaStream, props.focused] as const,
  ([stream, focused]) => {
    // Focused card: DVR composable owns the <video> element
    if (focused) return
    attachLiveStream(stream)
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
  if (!props.focused) {
    attachLiveStream(props.mediaStream)
  }
  const el = videoRef.value
  if (el) {
    el.volume = props.volume
    el.muted = props.muted
  }
})
</script>

<template>
  <article
    class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-black/40"
    :class="focused ? 'ring-2 ring-[var(--accent)]' : ''"
  >
    <div class="relative min-h-0 flex-1 bg-black" @dblclick="emit('focus')">
      <video
        ref="videoRef"
        class="absolute inset-0 h-full w-full object-contain"
        autoplay
        playsinline
      />
      <div class="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs">
        {{ title }} · {{ formatted }}
      </div>
      <div
        v-if="focused"
        class="absolute right-2 top-2 flex items-center gap-1.5"
      >
        <span
          class="rounded px-2 py-1 text-xs font-semibold"
          :class="isLive ? 'bg-red-600 text-white' : 'bg-amber-500/90 text-black'"
        >
          {{ delayLabel }}
        </span>
        <span
          v-if="recording"
          class="rounded bg-black/60 px-2 py-1 text-[10px] text-[var(--text-muted)]"
        >
          버퍼 {{ bufferReadySec }}s
        </span>
      </div>
      <div
        v-if="viewerNames.length"
        class="pointer-events-none absolute bottom-2 left-2 max-w-[70%] truncate rounded bg-black/60 px-2 py-1 text-[11px] text-[var(--text-muted)]"
      >
        시청: {{ viewerNames.join(', ') }}
      </div>
    </div>

    <div
      v-if="focused"
      class="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2"
    >
      <button
        type="button"
        class="btn-ghost !px-2 !py-1 text-xs"
        :disabled="!canSeekBack"
        title="5초 뒤로 (←)"
        @click="seekBack"
      >
        ⏪ -{{ SEEK_STEP_MS / 1000 }}s
      </button>
      <button
        type="button"
        class="btn-ghost !px-2 !py-1 text-xs"
        :disabled="!canSeekForward"
        title="5초 앞으로 (→)"
        @click="seekForward"
      >
        +{{ SEEK_STEP_MS / 1000 }}s ⏩
      </button>
      <button
        type="button"
        class="btn-primary !px-3 !py-1 text-xs"
        :disabled="isLive"
        title="라이브로 복귀 (L / End)"
        @click="goLive"
      >
        라이브로
      </button>
      <span class="text-[11px] text-[var(--text-muted)]">
        ←/→ 5초 · L 라이브 · 최대 약 1분
      </span>
      <p v-if="dvrError" class="w-full text-xs text-[var(--danger)]">{{ dvrError }}</p>
    </div>

    <div class="flex shrink-0 items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-panel)] px-3 py-2">
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
