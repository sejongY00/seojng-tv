import { useLocalStorage } from '@vueuse/core'

export function useClientId() {
  const clientId = useLocalStorage('sejong.clientId', '')

  if (import.meta.client && !clientId.value) {
    clientId.value =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  return { clientId }
}
