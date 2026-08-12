<script setup lang="ts">
const props = defineProps<{
  roomName: string
  nickname: string
  joinedAt: number | null
  isSharing: boolean
  memberCount: number
  maxMembers: number
  layoutMode: 'grid' | 'focus'
}>()

const emit = defineEmits<{
  toggleShare: []
  toggleLayout: []
  leave: []
}>()

const { formatted } = useRoomTimer(() => props.joinedAt)
</script>

<template>
  <header class="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/80 px-4 py-3 backdrop-blur">
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold">{{ roomName }}</p>
      <p class="text-xs text-[var(--text-muted)]">
        {{ nickname }} · 입장 {{ formatted }} · {{ memberCount }}/{{ maxMembers }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button class="btn-ghost" type="button" @click="emit('toggleLayout')">
        {{ layoutMode === 'grid' ? '포커스' : '그리드' }}
      </button>
      <button
        type="button"
        :class="isSharing ? 'btn-danger' : 'btn-primary'"
        @click="emit('toggleShare')"
      >
        {{ isSharing ? '공유 중지' : '화면 공유' }}
      </button>
      <button class="btn-ghost" type="button" @click="emit('leave')">나가기</button>
    </div>
  </header>
</template>
