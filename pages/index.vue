<script setup lang="ts">
const roomCode = ref('')

function goRoom() {
  const id = roomCode.value.trim()
  if (!id) return
  navigateTo(`/room/${id}`)
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
    <p class="text-sm uppercase tracking-[0.2em] text-[var(--accent)]">Sejong TV</p>
    <h1 class="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
      멀티 스크린<br />화면 공유
    </h1>
    <p class="mt-4 max-w-xl text-[var(--text-muted)]">
      관리자가 만든 방 URL로 입장해 여러 화면을 동시에 시청하고, 스트림별로 볼륨을 조절하세요.
    </p>

    <form class="mt-10 flex flex-col gap-3 sm:flex-row" @submit.prevent="goRoom">
      <input
        v-model="roomCode"
        class="input sm:flex-1"
        placeholder="방 ID 입력"
        autocomplete="off"
      />
      <button type="submit" class="btn-primary">방 입장</button>
    </form>

    <p class="mt-8 text-sm text-[var(--text-muted)]">
      관리자이신가요?
      <NuxtLink to="/admin" class="text-[var(--accent)] hover:underline">관리자 페이지</NuxtLink>
    </p>
  </main>
</template>
