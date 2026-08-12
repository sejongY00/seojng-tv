import bcrypt from 'bcryptjs'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, 'roomId')
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Room id required' })
  }

  const body = await readBody<{ name?: string; password?: string }>(event)
  const existing = await prisma.room.findUnique({ where: { id: roomId } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  const data: { name?: string; passwordHash?: string; pwdVersion?: number } = {}
  if (body?.name?.trim()) {
    data.name = body.name.trim()
  }
  if (body?.password) {
    if (body.password.length < 4) {
      throw createError({ statusCode: 400, statusMessage: 'Password must be at least 4 characters' })
    }
    data.passwordHash = await bcrypt.hash(body.password, 10)
    data.pwdVersion = existing.pwdVersion + 1
  }

  const room = await prisma.room.update({ where: { id: roomId }, data })

  return {
    id: room.id,
    name: room.name,
    pwdVersion: room.pwdVersion,
    createdAt: room.createdAt.toISOString(),
    createdBy: room.createdBy,
  }
})
