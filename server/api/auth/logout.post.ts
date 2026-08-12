import { ADMIN_COOKIE } from '../../utils/jwt'

export default defineEventHandler(async (event) => {
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
  return { ok: true }
})
