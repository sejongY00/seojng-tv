import { SignJWT, jwtVerify } from 'jose'

function getSecret() {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

export async function signAdminToken(username: string) {
  return new SignJWT({ role: 'admin', username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyAdminToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret())
  if (payload.role !== 'admin') {
    throw createError({ statusCode: 401, statusMessage: 'Invalid admin token' })
  }
  return payload as { role: string; username: string }
}

export const ADMIN_COOKIE = 'sejong_admin_token'
