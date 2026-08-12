<script setup lang="ts">
import type { RoomAdmin } from '~/types/room'

defineProps<{
  rooms: RoomAdmin[]
  loading?: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
  copy: [id: string]
  refresh: []
}>()
</script>

<template>
  <div class="panel overflow-hidden">
    <div class="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
      <h2 class="font-semibold">방 목록</h2>
      <button type="button" class="btn-ghost !py-1 text-xs" @click="emit('refresh')">새로고침</button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <tr>
            <th class="px-4 py-2 font-medium">이름</th>
            <th class="px-4 py-2 font-medium">ID</th>
            <th class="px-4 py-2 font-medium">인원</th>
            <th class="px-4 py-2 font-medium">방송</th>
            <th class="px-4 py-2 font-medium">생성</th>
            <th class="px-4 py-2 font-medium">동작</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in rooms" :key="room.id" class="border-t border-[var(--border)]">
            <td class="px-4 py-3">{{ room.name }}</td>
            <td class="px-4 py-3 font-mono text-xs text-[var(--text-muted)]">{{ room.id }}</td>
            <td class="px-4 py-3">{{ room.memberCount ?? 0 }}</td>
            <td class="px-4 py-3">{{ room.streamCount ?? 0 }}</td>
            <td class="px-4 py-3 text-[var(--text-muted)]">
              {{ room.createdAt ? new Date(room.createdAt).toLocaleString() : '-' }}
            </td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn-ghost !py-1 text-xs" @click="emit('copy', room.id)">
                  URL 복사
                </button>
                <NuxtLink :to="`/room/${room.id}`" class="btn-ghost !py-1 text-xs" target="_blank">
                  열기
                </NuxtLink>
                <button type="button" class="btn-danger !py-1 text-xs" @click="emit('delete', room.id)">
                  삭제
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rooms.length && !loading">
            <td colspan="6" class="px-4 py-8 text-center text-[var(--text-muted)]">
              생성된 방이 없습니다.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
