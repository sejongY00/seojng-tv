import { useLocalStorage } from '@vueuse/core'

export function useNickname() {
  const nickname = useLocalStorage('sejong.nickname', '')
  return { nickname }
}
