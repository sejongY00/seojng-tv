import { ADMIN_COOKIE, verifyAdminToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const token =
    getCookie(event, ADMIN_COOKIE) ||
    getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const payload = await verifyAdminToken(token)
    return { ok: true, username: payload.username }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
