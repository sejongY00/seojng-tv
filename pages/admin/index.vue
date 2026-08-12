<script setup lang="ts">
import type { RoomAdmin } from '~/types/room'

const rooms = ref<RoomAdmin[]>([])
const name = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const creating = ref(false)
const authed = ref(false)

async function ensureAuth() {
  try {
    await $fetch('/api/auth/me')
    authed.value = true
  } catch {
    await navigateTo('/admin/login')
  }
}

async function loadRooms() {
  loading.value = true
  try {
    rooms.value = await $fetch<RoomAdmin[]>('/api/rooms')
  } catch (e) {
    error.value = '방 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function createRoom() {
  error.value = null
  creating.value = true
  try {
    await $fetch('/api/rooms', {
      method: 'POST',
      body: { name: name.value, password: password.value },
    })
    name.value = ''
    password.value = ''
    await loadRooms()
  } catch (e: unknown) {
    error.value = '방 생성에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

async function deleteRoom(id: string) {
  if (!confirm('이 방을 삭제하면 접속 중인 사용자가 모두 퇴장합니다. 계속할까요?')) return
  await $fetch(`/api/rooms/${id}`, { method: 'DELETE' })
  await loadRooms()
}

async function copyUrl(id: string) {
  const url = `${window.location.origin}/room/${id}`
  await navigator.clipboard.writeText(url)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

onMounted(async () => {
  await ensureAuth()
  if (authed.value) await loadRooms()
})
</script>

<template>
  <main v-if="authed" class="mx-auto max-w-5xl space-y-6 px-4 py-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-widest text-[var(--accent)]">Sejong TV</p>
        <h1 class="text-2xl font-semibold">관리자</h1>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/" class="btn-ghost">홈</NuxtLink>
        <button type="button" class="btn-ghost" @click="logout">로그아웃</button>
      </div>
    </div>

    <form class="panel grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="createRoom">
      <input v-model="name" class="input" placeholder="방 이름" required />
      <input v-model="password" class="input" type="password" placeholder="방 비밀번호 (4자 이상)" required minlength="4" />
      <button type="submit" class="btn-primary" :disabled="creating">방 생성</button>
      <p v-if="error" class="md:col-span-3 text-sm text-[var(--danger)]">{{ error }}</p>
    </form>

    <AdminRoomTable
      :rooms="rooms"
      :loading="loading"
      @delete="deleteRoom"
      @copy="copyUrl"
      @refresh="loadRooms"
    />
  </main>
</template>
