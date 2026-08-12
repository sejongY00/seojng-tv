const BUFFER_MS = 60_000
const SEEK_STEP_MS = 5_000
const CHUNK_MS = 1_000

type BufferChunk = { blob: Blob; at: number }

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * Rolling ~60s MediaRecorder buffer for the focused live stream.
 * Seek back in 5s steps, then return to live.
 */
export function useStreamDvr(options: {
  enabled: MaybeRefOrGetter<boolean>
  stream: MaybeRefOrGetter<MediaStream | null | undefined>
  videoRef: Ref<HTMLVideoElement | null>
}) {
  const delayMs = ref(0)
  const bufferMs = ref(0)
  const recording = ref(false)
  const error = ref<string | null>(null)

  const isLive = computed(() => delayMs.value <= 0)
  const canSeekBack = computed(() => bufferMs.value - delayMs.value >= SEEK_STEP_MS)
  const canSeekForward = computed(() => delayMs.value >= SEEK_STEP_MS)

  const delayLabel = computed(() => {
    if (isLive.value) return 'LIVE'
    const sec = Math.round(delayMs.value / 1000)
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `-${m}:${String(s).padStart(2, '0')}`
  })

  let recorder: MediaRecorder | null = null
  let chunks: BufferChunk[] = []
  let mimeType = ''
  let objectUrl: string | null = null
  let applyToken = 0

  function revokeUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      objectUrl = null
    }
  }

  function pruneChunks() {
    const cutoff = Date.now() - BUFFER_MS
    // Keep index 0 (init segment). Drop middle/old payload chunks.
    while (chunks.length > 2 && chunks[1]!.at < cutoff) {
      chunks.splice(1, 1)
    }
    if (chunks.length) {
      bufferMs.value = Math.min(BUFFER_MS, Date.now() - chunks[0]!.at)
    } else {
      bufferMs.value = 0
    }
  }

  function stopRecorder() {
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // ignore
      }
    }
    recorder = null
    recording.value = false
    chunks = []
    bufferMs.value = 0
  }

  function startRecorder(stream: MediaStream) {
    stopRecorder()
    revokeUrl()
    error.value = null
    mimeType = pickMimeType()
    if (!mimeType) {
      error.value = '이 브라우저는 DVR 버퍼(MediaRecorder)를 지원하지 않습니다.'
      return
    }
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_000_000,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'MediaRecorder 시작 실패'
      return
    }

    chunks = []
    recorder.ondataavailable = (ev) => {
      if (!ev.data || ev.data.size === 0) return
      chunks.push({ blob: ev.data, at: Date.now() })
      pruneChunks()
    }
    recorder.onerror = () => {
      error.value = '녹화 버퍼 오류'
    }
    recorder.start(CHUNK_MS)
    recording.value = true
  }

  async function attachLive() {
    const el = options.videoRef.value
    const stream = toValue(options.stream)
    if (!el || !stream) return
    revokeUrl()
    el.pause()
    el.removeAttribute('src')
    el.load()
    el.srcObject = stream
    try {
      await el.play()
    } catch {
      // autoplay / user gesture
    }
  }

  async function attachDelayed(nextDelayMs: number) {
    const el = options.videoRef.value
    if (!el || chunks.length < 2) return

    const token = ++applyToken
    const blob = new Blob(
      chunks.map((c) => c.blob),
      { type: mimeType || 'video/webm' },
    )
    revokeUrl()
    objectUrl = URL.createObjectURL(blob)

    el.srcObject = null
    el.src = objectUrl

    await new Promise<void>((resolve) => {
      const onMeta = () => {
        el.removeEventListener('loadedmetadata', onMeta)
        resolve()
      }
      el.addEventListener('loadedmetadata', onMeta)
      // safety
      setTimeout(resolve, 800)
    })

    if (token !== applyToken) return

    const estimated = Math.max(0.1, (Date.now() - chunks[0]!.at) / 1000)
    const duration =
      Number.isFinite(el.duration) && el.duration > 0 && el.duration !== Infinity
        ? el.duration
        : estimated
    const maxDelay = Math.min(BUFFER_MS, Math.floor(duration * 1000))
    const clamped = Math.min(Math.max(0, nextDelayMs), maxDelay)
    delayMs.value = clamped
    el.currentTime = Math.max(0, duration - clamped / 1000)

    try {
      await el.play()
    } catch {
      // ignore
    }

    // If playback catches the end of buffer, return to live
    const onEnded = () => {
      el.removeEventListener('ended', onEnded)
      goLive()
    }
    el.addEventListener('ended', onEnded)
  }

  async function seekBy(deltaMs: number) {
    if (!toValue(options.enabled)) return
    const next = delayMs.value - deltaMs
    // deltaMs > 0 => toward live (reduce delay)
    // deltaMs < 0 => farther from live (increase delay)
    if (next <= 0) {
      await goLive()
      return
    }
    const maxDelay = Math.min(BUFFER_MS, bufferMs.value)
    const clamped = Math.min(next, maxDelay)
    if (clamped < SEEK_STEP_MS && next > 0) {
      // not enough buffer yet
      return
    }
    await attachDelayed(clamped)
  }

  async function seekBack() {
    await seekBy(-SEEK_STEP_MS)
  }

  async function seekForward() {
    await seekBy(SEEK_STEP_MS)
  }

  async function goLive() {
    delayMs.value = 0
    await attachLive()
  }

  function onKeydown(ev: KeyboardEvent) {
    if (!toValue(options.enabled)) return
    const tag = (ev.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (ev.target as HTMLElement)?.isContentEditable) {
      return
    }
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault()
      seekBack()
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault()
      seekForward()
    } else if (ev.key === 'End' || ev.key === 'l' || ev.key === 'L') {
      ev.preventDefault()
      goLive()
    }
  }

  watch(
    () => [toValue(options.enabled), toValue(options.stream), options.videoRef.value] as const,
    ([enabled, stream, el]) => {
      if (!import.meta.client) return
      if (enabled && stream && el) {
        startRecorder(stream)
        delayMs.value = 0
        attachLive()
      } else if (!enabled || !stream) {
        stopRecorder()
        revokeUrl()
        delayMs.value = 0
        // Non-focused cards keep normal srcObject binding elsewhere
      }
    },
    { immediate: true, flush: 'post' },
  )

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    stopRecorder()
    revokeUrl()
  })

  return {
    BUFFER_MS,
    SEEK_STEP_MS,
    delayMs,
    bufferMs,
    recording,
    error,
    isLive,
    canSeekBack,
    canSeekForward,
    delayLabel,
    seekBack,
    seekForward,
    goLive,
  }
}
