/**
 * PIN session token utilities (Edge + Node compatible).
 *
 * Why:
 * - A plain cookie value like "pinVerified=true" is forgeable by anyone.
 * - We instead issue a signed, expiring token and verify it on every request.
 */
 
const COOKIE_SECRET_ENV = 'PIN_COOKIE_SECRET'
const COOKIE_NAME = 'pinVerified'
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 hours
 
function getEnv(name: string): string | undefined {
  // In Next.js middleware/edge, process.env is available at build/runtime.
  return process.env[name]
}
 
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  // btoa expects latin1 binary string
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
 
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
 
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}
 
function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
 
function getSecretBytes(): Uint8Array {
  const explicit = getEnv(COOKIE_SECRET_ENV)
  if (explicit) return new TextEncoder().encode(explicit)
 
  // Prefer ENCRYPTION_KEY if present (it is base64 encoded 32 bytes)
  const encryptionKey = getEnv('ENCRYPTION_KEY')
  if (encryptionKey) return decodeBase64ToBytes(encryptionKey)
 
  // Fallback to service role key (string) to avoid introducing a new required env var.
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRoleKey) return new TextEncoder().encode(serviceRoleKey)
 
  throw new Error(
    `Missing cookie signing secret. Set ${COOKIE_SECRET_ENV} (recommended) or ENCRYPTION_KEY.`
  )
}
 
async function hmacSha256Base64Url(message: string): Promise<string> {
  const keyBytes = getSecretBytes()
  // Create a new Uint8Array to ensure proper type compatibility with crypto.subtle
  const keyBuffer = new Uint8Array(keyBytes)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return base64UrlEncode(new Uint8Array(sig))
}
 
export function getPinCookieName(): string {
  return COOKIE_NAME
}
 
export async function createPinSessionToken(maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + maxAgeSeconds
  const payload = `${now}.${exp}`
  const sig = await hmacSha256Base64Url(payload)
  return `${payload}.${sig}`
}
 
export async function verifyPinSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
 
  const [iatStr, expStr, sig] = parts
  const iat = Number(iatStr)
  const exp = Number(expStr)
  if (!Number.isFinite(iat) || !Number.isFinite(exp)) return false
 
  const now = Math.floor(Date.now() / 1000)
  if (exp <= now) return false
 
  const expected = await hmacSha256Base64Url(`${iatStr}.${expStr}`)
  return safeEqual(sig, expected)
}
 
export async function parsePinSessionFromCookieValue(value: string | undefined | null): Promise<{ valid: boolean; exp?: number }> {
  if (!value) return { valid: false }
  const parts = value.split('.')
  if (parts.length !== 3) return { valid: false }
  const exp = Number(parts[1])
  const valid = await verifyPinSessionToken(value)
  return valid && Number.isFinite(exp) ? { valid: true, exp } : { valid: false }
}
