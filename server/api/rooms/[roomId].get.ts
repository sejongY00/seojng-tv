import { prisma } from '../../utils/db'
import { getMemberCount, getStreamCount } from '../../utils/runtimeRooms'

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, 'roomId')
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Room id required' })
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  return {
    id: room.id,
    name: room.name,
    memberCount: getMemberCount(room.id),
    streamCount: getStreamCount(room.id),
  }
})
