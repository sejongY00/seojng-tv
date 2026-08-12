<script setup lang="ts">
import type { ActiveStream, RoomState } from '~/types/room'
import { rtcLog } from '~/utils/rtcLog'

const route = useRoute()
const config = useRuntimeConfig()
const roomId = computed(() => String(route.params.roomId || ''))

const store = useRoomStore()
const { clientId } = useClientId()
const { nickname } = useNickname()
const { accessToken, requestAccess, clearAccess } = useRoomAccess(roomId)
const { socket, connect, disconnect } = useSocket()
const { unlockAudio } = useAudioUnlock()
const {
  localStream,
  streamId: localStreamId,
  isSharing,
  startShare,
  stopShare,
} = useScreenShare()

const roomMeta = ref<{ id: string; name: string } | null>(null)
const showJoin = ref(true)
const needPassword = ref(true)
const joinLoading = ref(false)
const joinError = ref<string | null>(null)
const shareError = ref<string | null>(null)
const localStartedAt = ref<number | null>(null)
const handlersBound = ref(false)

const {
  remoteStreams,
  createOfferAsViewer,
  closePeer,
  closeAll,
  bindSocketHandlers,
} = useWebRTC({
  socket,
  clientId,
  getLocalStream: () => localStream.value,
})

const maxMembers = computed(() => config.public.maxRoomMembers || 8)

const watchingStreams = computed(() =>
  store.activeStreams.filter((s) => store.watchingStreamIds.includes(s.streamId)),
)

const viewerNamesByStream = computed(() => {
  const out: Record<string, string[]> = {}
  for (const [streamId, viewerIds] of Object.entries(store.viewersOfStream)) {
    out[streamId] = viewerIds.map(
      (id) => store.participants.find((p) => p.clientId === id)?.nickname || id.slice(0, 6),
    )
  }
  return out
})

const localPreview = computed(() => {
  if (!localStream.value || !localStreamId.value) return null
  return {
    streamId: localStreamId.value,
    stream: localStream.value,
    title: nickname.value || '나',
    startedAt: localStartedAt.value || Date.now(),
  }
})

async function loadMeta() {
  try {
    roomMeta.value = await $fetch(`/api/rooms/${roomId.value}`)
    store.roomName = roomMeta.value.name
  } catch {
    joinError.value = '존재하지 않는 방입니다.'
  }
}

async function tryTokenJoin() {
  if (!accessToken.value) {
    needPassword.value = true
    return
  }
  try {
    const res = await requestAccess({
      clientId: clientId.value,
      accessToken: accessToken.value,
    })
    roomMeta.value = res.room
    store.roomName = res.room.name
    needPassword.value = false
    // still show dialog for nickname confirm, or auto-join
    if (nickname.value) {
      await enterRoom(nickname.value)
    }
  } catch {
    clearAccess()
    needPassword.value = true
  }
}

function bindSocketOnce() {
  if (handlersBound.value || !socket.value) return
  handlersBound.value = true
  bindSocketHandlers()

  socket.value.on('room:state', (state: RoomState) => {
    store.applyState(state)
  })

  socket.value.on('room:force-close', ({ reason }) => {
    store.error = reason
    leaveRoom(false)
    alert(reason)
    navigateTo('/')
  })

  socket.value.on('room:error', ({ error }) => {
    store.error = error
  })
}

async function enterRoom(nick: string, password?: string) {
  joinLoading.value = true
  joinError.value = null
  try {
    if (needPassword.value || password) {
      await requestAccess({
        clientId: clientId.value,
        password,
        accessToken: accessToken.value || undefined,
      })
    } else if (accessToken.value) {
      await requestAccess({
        clientId: clientId.value,
        accessToken: accessToken.value,
      })
    }

    connect()
    bindSocketOnce()

    await new Promise<void>((resolve, reject) => {
      const s = socket.value
      if (!s) {
        reject(new Error('Socket not connected'))
        return
      }
      const doJoin = () => {
        s.emit(
          'room:join',
          {
            roomId: roomId.value,
            clientId: clientId.value,
            nickname: nick,
            accessToken: accessToken.value,
          },
          (res) => {
            if (!res?.ok) {
              reject(new Error(res?.error || 'Join failed'))
              return
            }
            resolve()
          },
        )
      }
      if (s.connected) doJoin()
      else s.once('connect', doJoin)
    })

    nickname.value = nick
    store.joined = true
    store.joinedAt = Date.now()
    showJoin.value = false
    needPassword.value = false
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '입장 실패'
    joinError.value = msg
    if (msg.includes('Password') || msg.includes('password') || msg.includes('Invalid')) {
      needPassword.value = true
      clearAccess()
    }
  } finally {
    joinLoading.value = false
  }
}

async function onJoinSubmit(payload: { nickname: string; password?: string }) {
  needPassword.value = Boolean(payload.password) || needPassword.value
  await enterRoom(payload.nickname, payload.password)
}

async function toggleShare() {
  shareError.value = null
  if (isSharing.value) {
    const sid = localStreamId.value
    stopShare()
    if (sid) socket.value?.emit('stream:stop', { streamId: sid })
    localStartedAt.value = null
    return
  }

  try {
    await unlockAudio()
    const { streamId } = await startShare(clientId.value)
    await new Promise<void>((resolve, reject) => {
      socket.value?.emit('stream:start', { streamId }, (res) => {
        if (!res?.ok) reject(new Error(res?.error || 'Stream start failed'))
        else resolve()
      })
    })
    localStartedAt.value = Date.now()
    store.ensureAudioDefaults(streamId)
    store.mutedMap = { ...store.mutedMap, [streamId]: true }
  } catch (e: unknown) {
    stopShare()
    shareError.value = e instanceof Error ? e.message : '화면 공유 실패'
  }
}

async function watchStream(stream: ActiveStream) {
  rtcLog('watch:start local', {
    streamId: stream.streamId,
    broadcasterId: stream.broadcasterId,
  })
  await unlockAudio()
  store.ensureAudioDefaults(stream.streamId)
  store.setWatching(stream.streamId, true)
  if (!store.focusStreamId) store.focusStreamId = stream.streamId
  socket.value?.emit('watch:start', {
    streamId: stream.streamId,
    broadcasterId: stream.broadcasterId,
  })
  await createOfferAsViewer(stream.broadcasterId, stream.streamId)
}

function unwatchStream(stream: ActiveStream) {
  rtcLog('watch:stop local', {
    streamId: stream.streamId,
    broadcasterId: stream.broadcasterId,
  })
  store.setWatching(stream.streamId, false)
  socket.value?.emit('watch:stop', {
    streamId: stream.streamId,
    broadcasterId: stream.broadcasterId,
  })
  closePeer(stream.broadcasterId, stream.streamId)
}

function onStopWatch(streamId: string) {
  if (localStreamId.value === streamId) {
    toggleShare()
    return
  }
  const stream = store.activeStreams.find((s) => s.streamId === streamId)
  if (stream) unwatchStream(stream)
}

function leaveRoom(navigate = true) {
  if (isSharing.value) {
    const sid = localStreamId.value
    stopShare()
    if (sid) socket.value?.emit('stream:stop', { streamId: sid })
  }
  for (const sid of [...store.watchingStreamIds]) {
    const stream = store.activeStreams.find((s) => s.streamId === sid)
    if (stream) unwatchStream(stream)
  }
  socket.value?.emit('room:leave')
  closeAll()
  store.reset()
  disconnect()
  handlersBound.value = false
  showJoin.value = true
  if (navigate) navigateTo('/')
}

onMounted(async () => {
  await loadMeta()
  await tryTokenJoin()
})

onBeforeUnmount(() => {
  leaveRoom(false)
})
</script>

<template>
  <div class="flex h-screen flex-col">
    <RoomJoinDialog
      v-if="showJoin"
      :room-name="roomMeta?.name || store.roomName || roomId"
      :need-password="needPassword"
      :loading="joinLoading"
      :error="joinError"
      @submit="onJoinSubmit"
    />

    <template v-if="store.joined">
      <RoomHeader
        :room-name="store.roomName || roomMeta?.name || roomId"
        :nickname="nickname"
        :joined-at="store.joinedAt"
        :is-sharing="isSharing"
        :member-count="store.participants.length"
        :max-members="maxMembers"
        :layout-mode="store.layoutMode"
        @toggle-share="toggleShare"
        @toggle-layout="store.layoutMode = store.layoutMode === 'grid' ? 'focus' : 'grid'"
        @leave="leaveRoom()"
      />

      <p v-if="shareError" class="bg-[var(--danger)]/20 px-4 py-2 text-sm text-[var(--danger)]">
        {{ shareError }}
      </p>

      <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
        <RoomParticipantList
          class="hidden md:flex"
          :participants="store.participants"
          :active-streams="store.activeStreams"
          :watch-map="store.watchMap"
          :my-client-id="clientId"
          :watching-stream-ids="store.watchingStreamIds"
          @watch="watchStream"
          @unwatch="unwatchStream"
        />

        <main class="flex min-h-0 flex-col gap-3 overflow-auto p-3 md:overflow-hidden">
          <div class="shrink-0 md:hidden">
            <RoomParticipantList
              :participants="store.participants"
              :active-streams="store.activeStreams"
              :watch-map="store.watchMap"
              :my-client-id="clientId"
              :watching-stream-ids="store.watchingStreamIds"
              @watch="watchStream"
              @unwatch="unwatchStream"
            />
          </div>

          <RoomStreamGrid
            class="min-h-0 flex-1"
            :streams="watchingStreams"
            :remote-streams="remoteStreams"
            :local-preview="localPreview"
            :layout-mode="store.layoutMode"
            :focus-stream-id="store.focusStreamId"
            :volume-map="store.volumeMap"
            :muted-map="store.mutedMap"
            :viewer-names-by-stream="viewerNamesByStream"
            @update:volume="(id, v) => (store.volumeMap = { ...store.volumeMap, [id]: v })"
            @update:muted="(id, v) => (store.mutedMap = { ...store.mutedMap, [id]: v })"
            @stop="onStopWatch"
            @focus="store.focusStreamId = $event"
          />
        </main>
      </div>
    </template>
  </div>
</template>
