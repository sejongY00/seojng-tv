import { useLocalStorage } from '@vueuse/core'

export function useRoomAccess(roomId: MaybeRefOrGetter<string>) {
  const storageKey = computed(() => `sejong.roomAccess.${toValue(roomId)}`)
  const accessToken = useLocalStorage(storageKey, '')

  async function requestAccess(options: {
    clientId: string
    password?: string
    accessToken?: string
  }) {
    const id = toValue(roomId)
    const res = await $fetch<{ accessToken: string; room: { id: string; name: string } }>(
      `/api/rooms/${id}/access`,
      {
        method: 'POST',
        body: {
          clientId: options.clientId,
          password: options.password,
          accessToken: options.accessToken || accessToken.value || undefined,
        },
      },
    )
    accessToken.value = res.accessToken
    return res
  }

  function clearAccess() {
    accessToken.value = ''
  }

  return { accessToken, requestAccess, clearAccess }
}
