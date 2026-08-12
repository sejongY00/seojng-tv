import { prisma } from '../../utils/db'
import { getMemberCount, getStreamCount } from '../../utils/runtimeRooms'

export default defineEventHandler(async () => {
  const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'desc' } })
  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    pwdVersion: room.pwdVersion,
    createdAt: room.createdAt.toISOString(),
    createdBy: room.createdBy,
    memberCount: getMemberCount(room.id),
    streamCount: getStreamCount(room.id),
  }))
})
