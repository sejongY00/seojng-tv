/** Minimal debug logger for WebRTC / room signaling. Filter console by: sejong-rtc */
export function rtcLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('[sejong-rtc]', ...args)
}

export function rtcWarn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn('[sejong-rtc]', ...args)
}

/** Summarize ICE candidate for logs without dumping full SDP. */
export function iceSummary(candidate?: RTCIceCandidateInit | null) {
  if (!candidate?.candidate) return { endOfCandidates: true }
  const parts = candidate.candidate.split(' ')
  return {
    type: parts[7] || '?',
    protocol: parts[2] || '?',
    address: parts[4] || '?',
    port: parts[5] || '?',
  }
}
