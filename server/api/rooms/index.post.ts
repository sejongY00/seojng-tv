import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name?: string; password?: string }>(event)

  if (!body?.name?.trim() || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Name and password required' })
  }

  if (body.password.length < 4) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 4 characters' })
  }

  const id = nanoid(10)
  const passwordHash = await bcrypt.hash(body.password, 10)
  const admin = event.context.admin as { username?: string } | undefined

  const room = await prisma.room.create({
    data: {
      id,
      name: body.name.trim(),
      passwordHash,
      pwdVersion: 1,
      createdBy: admin?.username || 'admin',
    },
  })

  return {
    id: room.id,
    name: room.name,
    pwdVersion: room.pwdVersion,
    createdAt: room.createdAt.toISOString(),
    createdBy: room.createdBy,
    url: `/room/${room.id}`,
  }
})
