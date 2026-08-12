export function useScreenShare() {
  const localStream = ref<MediaStream | null>(null)
  const streamId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const isSharing = computed(() => Boolean(localStream.value))

  async function startShare(clientId: string) {
    error.value = null
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 60 },
          // @ts-expect-error displaySurface is supported in Chromium
          displaySurface: 'window',
        },
        audio: {
          // @ts-expect-error Chromium system audio options
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      localStream.value = stream
      streamId.value = `${clientId}-${Date.now()}`

      const videoTrack = stream.getVideoTracks()[0]
      videoTrack?.addEventListener('ended', () => {
        stopShare()
      })

      return { stream, streamId: streamId.value }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Screen share failed'
      throw e
    }
  }

  function stopShare() {
    localStream.value?.getTracks().forEach((t) => t.stop())
    localStream.value = null
    streamId.value = null
  }

  onBeforeUnmount(() => {
    stopShare()
  })

  return { localStream, streamId, isSharing, error, startShare, stopShare }
}
