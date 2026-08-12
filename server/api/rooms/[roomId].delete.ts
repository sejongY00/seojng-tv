import { prisma } from '../../utils/db'
import { forceCloseRoom } from '../../utils/runtimeRooms'

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, 'roomId')
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Room id required' })
  }

  const existing = await prisma.room.findUnique({ where: { id: roomId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  forceCloseRoom(roomId, 'Room deleted by admin')
  await prisma.room.delete({ where: { id: roomId } })

  return { ok: true }
})
