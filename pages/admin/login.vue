<script setup lang="ts">
definePageMeta({ layout: 'default' })

const username = ref('admin')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function login() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await navigateTo('/admin')
  } catch (e: unknown) {
    error.value = '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await $fetch('/api/auth/me')
    await navigateTo('/admin')
  } catch {
    // not logged in
  }
})
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
    <form class="panel space-y-4 p-6" @submit.prevent="login">
      <div>
        <p class="text-xs uppercase tracking-widest text-[var(--text-muted)]">Admin</p>
        <h1 class="mt-1 text-2xl font-semibold">관리자 로그인</h1>
      </div>
      <label class="block space-y-1.5">
        <span class="text-sm text-[var(--text-muted)]">아이디</span>
        <input v-model="username" class="input" required />
      </label>
      <label class="block space-y-1.5">
        <span class="text-sm text-[var(--text-muted)]">비밀번호</span>
        <input v-model="password" class="input" type="password" required />
      </label>
      <p v-if="error" class="text-sm text-[var(--danger)]">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '로그인 중…' : '로그인' }}
      </button>
      <NuxtLink to="/" class="block text-center text-sm text-[var(--text-muted)] hover:underline">
        홈으로
      </NuxtLink>
    </form>
  </main>
</template>
