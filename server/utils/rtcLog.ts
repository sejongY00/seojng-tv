/** Server-side minimal signaling / WebRTC relay logs. */
export function rtcLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('[sejong-rtc]', ...args)
}

export function rtcWarn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn('[sejong-rtc]', ...args)
}
