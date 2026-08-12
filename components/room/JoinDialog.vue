<script setup lang="ts">
const props = defineProps<{
  roomName: string
  needPassword: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  submit: [payload: { nickname: string; password?: string }]
}>()

const { nickname } = useNickname()
const password = ref('')
const localNick = ref(nickname.value || '')

function onSubmit() {
  if (!localNick.value.trim()) return
  nickname.value = localNick.value.trim()
  emit('submit', {
    nickname: localNick.value.trim(),
    password: props.needPassword ? password.value : undefined,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <form class="panel w-full max-w-md space-y-4 p-6 shadow-xl" @submit.prevent="onSubmit">
      <div>
        <p class="text-xs uppercase tracking-widest text-[var(--text-muted)]">방 입장</p>
        <h2 class="mt-1 text-xl font-semibold">{{ roomName || 'Room' }}</h2>
      </div>

      <label class="block space-y-1.5">
        <span class="text-sm text-[var(--text-muted)]">닉네임</span>
        <input v-model="localNick" class="input" maxlength="32" required placeholder="표시할 이름" />
      </label>

      <label v-if="needPassword" class="block space-y-1.5">
        <span class="text-sm text-[var(--text-muted)]">방 비밀번호</span>
        <input
          v-model="password"
          class="input"
          type="password"
          required
          placeholder="관리자가 설정한 비밀번호"
          autocomplete="current-password"
        />
      </label>

      <p v-if="error" class="text-sm text-[var(--danger)]">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '입장 중…' : '입장' }}
      </button>
    </form>
  </div>
</template>
