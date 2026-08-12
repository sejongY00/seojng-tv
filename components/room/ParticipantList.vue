<script setup lang="ts">
import type { ActiveStream, Participant, WatchMap } from '~/types/room'

const props = defineProps<{
  participants: Participant[]
  activeStreams: ActiveStream[]
  watchMap: WatchMap
  myClientId: string
  watchingStreamIds: string[]
}>()

const emit = defineEmits<{
  watch: [stream: ActiveStream]
  unwatch: [stream: ActiveStream]
}>()

function nicknameOf(clientId: string) {
  return props.participants.find((p) => p.clientId === clientId)?.nickname || clientId.slice(0, 6)
}

function viewersFor(streamId: string) {
  const ids: string[] = []
  for (const [viewerId, streams] of Object.entries(props.watchMap)) {
    if (streams.includes(streamId)) ids.push(viewerId)
  }
  return ids.map(nicknameOf)
}

function isWatching(streamId: string) {
  return props.watchingStreamIds.includes(streamId)
}

function watchingSummary(clientId: string) {
  const streams = props.watchMap[clientId] || []
  if (!streams.length) return '시청 없음'
  return streams
    .map((sid) => {
      const s = props.activeStreams.find((a) => a.streamId === sid)
      return s?.broadcasterNickname || 'stream'
    })
    .join(', ')
}
</script>

<template>
  <aside class="flex h-full flex-col gap-4 border-r border-[var(--border)] bg-[var(--bg-elevated)]/50 p-3">
    <section>
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        참여자 ({{ participants.length }})
      </h3>
      <ul class="space-y-2">
        <li
          v-for="p in participants"
          :key="p.clientId"
          class="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-2 text-sm"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium">
              {{ p.nickname }}
              <span v-if="p.clientId === myClientId" class="text-[var(--text-muted)]">(나)</span>
            </span>
            <span
              v-if="p.isStreaming"
              class="rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--accent)]"
            >
              LIVE
            </span>
          </div>
          <p class="mt-1 text-[11px] text-[var(--text-muted)]">
            시청: {{ watchingSummary(p.clientId) }}
          </p>
        </li>
      </ul>
    </section>

    <section class="flex-1 overflow-auto">
      <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        방송 중 ({{ activeStreams.length }})
      </h3>
      <ul class="space-y-2">
        <li
          v-for="s in activeStreams"
          :key="s.streamId"
          class="rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-2 text-sm"
        >
          <p class="font-medium">{{ s.broadcasterNickname }}</p>
          <p class="mt-0.5 text-[11px] text-[var(--text-muted)]">
            시청자: {{ viewersFor(s.streamId).join(', ') || '없음' }}
          </p>
          <div class="mt-2">
            <button
              v-if="s.broadcasterId !== myClientId"
              type="button"
              class="btn-ghost w-full !py-1 text-xs"
              @click="isWatching(s.streamId) ? emit('unwatch', s) : emit('watch', s)"
            >
              {{ isWatching(s.streamId) ? '시청 종료' : '시청' }}
            </button>
            <p v-else class="text-[11px] text-[var(--text-muted)]">내 화면</p>
          </div>
        </li>
        <li v-if="!activeStreams.length" class="text-xs text-[var(--text-muted)]">
          아직 공유 중인 화면이 없습니다.
        </li>
      </ul>
    </section>
  </aside>
</template>
