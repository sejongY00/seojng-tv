import bcrypt from 'bcryptjs'
import { prisma } from '../../../utils/db'
import { signRoomAccessToken, verifyRoomAccessToken } from '../../../utils/roomAccess'

export default defineEventHandler(async (event) => {
  const roomId = getRouterParam(event, 'roomId')
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Room id required' })
  }

  const body = await readBody<{
    password?: string
    clientId?: string
    accessToken?: string
  }>(event)

  if (!body?.clientId) {
    throw createError({ statusCode: 400, statusMessage: 'clientId required' })
  }

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  const expected = {
    roomId: room.id,
    clientId: body.clientId,
    pwdVersion: room.pwdVersion,
  }

  if (body.accessToken) {
    try {
      await verifyRoomAccessToken(body.accessToken, expected)
      const accessToken = await signRoomAccessToken(expected)
      return {
        accessToken,
        room: { id: room.id, name: room.name },
      }
    } catch {
      // fall through to password
    }
  }

  if (!body.password) {
    throw createError({ statusCode: 401, statusMessage: 'Password required' })
  }

  const valid = await bcrypt.compare(body.password, room.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid password' })
  }

  const accessToken = await signRoomAccessToken(expected)
  return {
    accessToken,
    room: { id: room.id, name: room.name },
  }
})
