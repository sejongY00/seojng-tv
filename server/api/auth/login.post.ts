import { ADMIN_COOKIE, signAdminToken } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const config = useRuntimeConfig()

  if (!body?.username || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password required' })
  }

  if (body.username !== config.adminUsername || body.password !== config.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = await signAdminToken(body.username)
  setCookie(event, ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { ok: true, username: body.username }
})
