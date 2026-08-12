let audioCtx: AudioContext | null = null

export function useAudioUnlock() {
  const unlocked = useState('audio-unlocked', () => false)

  async function unlockAudio() {
    if (!import.meta.client) return
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioCtx) audioCtx = new Ctx()
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
      unlocked.value = true
    } catch {
      // ignore
    }
  }

  return { unlocked, unlockAudio }
}
