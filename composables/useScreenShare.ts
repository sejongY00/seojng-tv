import { rtcLog, rtcWarn } from '~/utils/rtcLog'

export function useScreenShare() {
  const localStream = ref<MediaStream | null>(null)
  const streamId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const settings = ref<MediaTrackSettings | null>(null)
  const isSharing = computed(() => Boolean(localStream.value))

  async function startShare(clientId: string) {
    error.value = null
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 60, max: 60 },
          // Monitor capture reaches full 1080p; window capture is capped by the window size.
          // @ts-expect-error displaySurface is supported in Chromium
          displaySurface: 'monitor',
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
      if (videoTrack) {
        // Games favour framerate over per-frame sharpness.
        videoTrack.contentHint = 'motion'
        try {
          await videoTrack.applyConstraints({
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 },
          })
        } catch (e) {
          rtcWarn('applyConstraints failed', String(e))
        }
        settings.value = videoTrack.getSettings()
        rtcLog('capture:settings', settings.value)
        if ((settings.value.height || 0) < 1080) {
          rtcWarn(
            'capture below 1080p — pick a full monitor (window capture is limited to the window size)',
            { width: settings.value.width, height: settings.value.height },
          )
        }
        videoTrack.addEventListener('ended', () => {
          stopShare()
        })
      }

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
    settings.value = null
  }

  onBeforeUnmount(() => {
    stopShare()
  })

  return { localStream, streamId, settings, isSharing, error, startShare, stopShare }
}
