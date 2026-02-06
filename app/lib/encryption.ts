/**
 * Enterprise-Grade Encryption System
 * 
 * AES-256-GCM encryption for files and sensitive data
 * Uses Web Crypto API (browser) and Node.js crypto (server)
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16  // 128 bits
const TAG_LENGTH = 16
const SCRYPT_COST = 16384 // CPU/memory cost

/**
 * Get encryption key from environment or generate
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY
  
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY not set in environment variables')
  }
  
  // Key should be base64 encoded
  return Buffer.from(keyString, 'base64')
}

/**
 * Derive a key from a password using scrypt
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_COST })
}

/**
 * Generate a new encryption key
 * Use this once and store in environment variables
 */
export function generateEncryptionKey(): string {
  const key = randomBytes(KEY_LENGTH)
  return key.toString('base64')
}

/**
 * Encrypt data (server-side)
 */
export function encrypt(data: Buffer): {
  encrypted: Buffer
  iv: Buffer
  tag: Buffer
} {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ])
  
  const tag = cipher.getAuthTag()
  
  return { encrypted, iv, tag }
}

/**
 * Decrypt data (server-side)
 */
export function decrypt(
  encrypted: Buffer,
  iv: Buffer,
  tag: Buffer
): Buffer {
  const key = getEncryptionKey()
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])
}

/**
 * Encrypt a file
 */
export async function encryptFile(fileBuffer: Buffer): Promise<{
  encryptedData: Buffer
  metadata: {
    iv: string
    tag: string
    algorithm: string
  }
}> {
  const { encrypted, iv, tag } = encrypt(fileBuffer)
  
  return {
    encryptedData: encrypted,
    metadata: {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: ALGORITHM
    }
  }
}

/**
 * Decrypt a file
 */
export async function decryptFile(
  encryptedData: Buffer,
  metadata: {
    iv: string
    tag: string
    algorithm: string
  }
): Promise<Buffer> {
  const iv = Buffer.from(metadata.iv, 'base64')
  const tag = Buffer.from(metadata.tag, 'base64')
  
  return decrypt(encryptedData, iv, tag)
}

/**
 * Encrypt sensitive text (like PINs, tokens)
 */
export function encryptText(text: string): string {
  const buffer = Buffer.from(text, 'utf-8')
  const { encrypted, iv, tag } = encrypt(buffer)
  
  // Combine all parts into a single string
  const combined = Buffer.concat([iv, tag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt sensitive text
 */
export function decryptText(encryptedText: string): string {
  const combined = Buffer.from(encryptedText, 'base64')
  
  // Extract parts
  const iv = combined.slice(0, IV_LENGTH)
  const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH)
  
  const decrypted = decrypt(encrypted, iv, tag)
  return decrypted.toString('utf-8')
}

/**
 * Hash sensitive data (one-way, for comparison)
 */
export function hashData(data: string): string {
  return createHash('sha256')
    .update(data)
    .digest('hex')
}

/**
 * Secure random token generation
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url')
}

/**
 * Encrypt JSON data
 */
export function encryptJSON(data: unknown): string {
  const json = JSON.stringify(data)
  return encryptText(json)
}

/**
 * Decrypt JSON data
 */
export function decryptJSON<T>(encryptedData: string): T {
  const json = decryptText(encryptedData)
  return JSON.parse(json)
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey()
    return true
  } catch {
    return false
  }
}

/**
 * Validate encryption key strength
 */
export function validateEncryptionKey(): {
  valid: boolean
  error?: string
} {
  try {
    const key = getEncryptionKey()
    
    if (key.length !== KEY_LENGTH) {
      return {
        valid: false,
        error: `Key must be ${KEY_LENGTH} bytes (256 bits), got ${key.length} bytes`
      }
    }
    
    // Test encryption/decryption
    const testData = Buffer.from('encryption test')
    const { encrypted, iv, tag } = encrypt(testData)
    const decrypted = decrypt(encrypted, iv, tag)
    
    if (!testData.equals(decrypted)) {
      return {
        valid: false,
        error: 'Encryption test failed - key may be corrupted'
      }
    }
    
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

