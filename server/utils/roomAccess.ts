import { SignJWT, jwtVerify } from 'jose'

export interface RoomAccessClaims {
  roomId: string
  clientId: string
  pwdVersion: number
}

function getSecret() {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

export async function signRoomAccessToken(claims: RoomAccessClaims) {
  const config = useRuntimeConfig()
  const days = config.roomAccessTtlDays || 7
  return new SignJWT({ ...claims, typ: 'room_access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getSecret())
}

export async function verifyRoomAccessToken(
  token: string,
  expected: { roomId: string; clientId: string; pwdVersion: number },
) {
  const { payload } = await jwtVerify(token, getSecret())
  if (payload.typ !== 'room_access') {
    throw new Error('Invalid token type')
  }
  if (payload.roomId !== expected.roomId) {
    throw new Error('Room mismatch')
  }
  if (payload.clientId !== expected.clientId) {
    throw new Error('Client mismatch')
  }
  if (Number(payload.pwdVersion) !== expected.pwdVersion) {
    throw new Error('Password changed')
  }
  return payload as unknown as RoomAccessClaims
}
