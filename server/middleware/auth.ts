import { ADMIN_COOKIE, verifyAdminToken } from '../utils/jwt'

/**
 * Protects admin room management endpoints.
 * Public: GET /api/rooms/:roomId (meta), POST /api/rooms/:roomId/access
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const method = event.method

  if (!path.startsWith('/api/rooms')) return

  const isAccess = /\/api\/rooms\/[^/]+\/access$/.test(path) && method === 'POST'
  const isPublicMeta = /\/api\/rooms\/[^/]+$/.test(path) && method === 'GET' && path !== '/api/rooms'
  if (isAccess || isPublicMeta) return

  const needsAuth =
    path === '/api/rooms' ||
    (/\/api\/rooms\/[^/]+$/.test(path) && (method === 'PATCH' || method === 'DELETE'))

  if (!needsAuth) return

  const token =
    getCookie(event, ADMIN_COOKIE) ||
    getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    event.context.admin = await verifyAdminToken(token)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
