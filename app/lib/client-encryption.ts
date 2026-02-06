/**
 * Client-Side Encryption
 * 
 * Browser-based encryption using Web Crypto API
 * For encrypting sensitive files before upload
 */

// Algorithm configuration
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits recommended for GCM

/**
 * Generate a new encryption key using Web Crypto API
 */
export async function generateKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * Export key to base64 string for storage/transmission
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(exported)
}

/**
 * Import key from base64 string
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString)
  
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a file in the browser
 */
export async function encryptFile(file: File): Promise<{
  encryptedFile: Blob
  metadata: {
    originalName: string
    originalSize: number
    originalType: string
    iv: string
    key: string
  }
}> {
  // Generate key and IV
  const key = await generateKey()
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  // Read file as array buffer
  const fileBuffer = await file.arrayBuffer()
  
  // Encrypt
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    fileBuffer
  )
  
  // Export key for storage
  const keyString = await exportKey(key)
  
  // Create encrypted blob
  const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' })
  
  return {
    encryptedFile: encryptedBlob,
    metadata: {
      originalName: file.name,
      originalSize: file.size,
      originalType: file.type,
      iv: arrayBufferToBase64(iv.buffer),
      key: keyString,
    }
  }
}

/**
 * Decrypt a file in the browser
 */
export async function decryptFile(
  encryptedBlob: Blob,
  metadata: {
    iv: string
    key: string
    originalType: string
    originalName: string
  }
): Promise<File> {
  // Import key and IV
  const key = await importKey(metadata.key)
  const iv = base64ToArrayBuffer(metadata.iv)
  
  // Read encrypted data
  const encryptedData = await encryptedBlob.arrayBuffer()
  
  // Decrypt
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(iv),
    },
    key,
    encryptedData
  )
  
  // Create file from decrypted data
  return new File([decrypted], metadata.originalName, {
    type: metadata.originalType,
  })
}

/**
 * Encrypt text data
 */
export async function encryptText(text: string): Promise<{
  encrypted: string
  iv: string
  key: string
}> {
  const key = await generateKey()
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data
  )
  
  const keyString = await exportKey(key)
  
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
    key: keyString,
  }
}

/**
 * Decrypt text data
 */
export async function decryptText(
  encryptedText: string,
  ivString: string,
  keyString: string
): Promise<string> {
  const key = await importKey(keyString)
  const iv = base64ToArrayBuffer(ivString)
  const encrypted = base64ToArrayBuffer(encryptedText)
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(iv),
    },
    key,
    encrypted
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Hash data using SHA-256 (for integrity checking)
 */
export async function hashData(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer
  
  if (typeof data === 'string') {
    const encoder = new TextEncoder()
    buffer = encoder.encode(data).buffer
  } else {
    buffer = data
  }
  
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
  return arrayBufferToBase64(hashBuffer)
}

/**
 * Generate secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const buffer = new ArrayBuffer(length)
  const array = new Uint8Array(buffer)
  return window.crypto.getRandomValues(array)
}

/**
 * Generate secure random string (for tokens, IDs, etc.)
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = generateRandomBytes(length)
  return arrayBufferToBase64(bytes.buffer)
}

/**
 * Encrypt file with password (PBKDF2 key derivation)
 */
export async function encryptFileWithPassword(
  file: File,
  password: string
): Promise<{
  encryptedFile: Blob
  metadata: {
    originalName: string
    originalSize: number
    originalType: string
    iv: string
    salt: string
  }
}> {
  // Generate salt and IV
  const salt = generateRandomBytes(16)
  const iv = generateRandomBytes(IV_LENGTH)
  
  // Derive key from password
  const key = await deriveKeyFromPassword(password, salt)
  
  // Read and encrypt file
  const fileBuffer = await file.arrayBuffer()
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv as Uint8Array<ArrayBuffer>,
    },
    key,
    fileBuffer
  )
  
  const encryptedBlob = new Blob([encrypted], { type: 'application/octet-stream' })
  
  return {
    encryptedFile: encryptedBlob,
    metadata: {
      originalName: file.name,
      originalSize: file.size,
      originalType: file.type,
      iv: arrayBufferToBase64(iv.buffer),
      salt: arrayBufferToBase64(salt.buffer),
    }
  }
}

/**
 * Decrypt file with password
 */
export async function decryptFileWithPassword(
  encryptedBlob: Blob,
  password: string,
  metadata: {
    iv: string
    salt: string
    originalType: string
    originalName: string
  }
): Promise<File> {
  // Import IV and salt
  const iv = base64ToArrayBuffer(metadata.iv)
  const salt = base64ToArrayBuffer(metadata.salt)
  
  // Derive key from password
  const key = await deriveKeyFromPassword(password, new Uint8Array(salt))
  
  // Read and decrypt
  const encryptedData = await encryptedBlob.arrayBuffer()
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(iv),
    },
    key,
    encryptedData
  )
  
  return new File([decrypted], metadata.originalName, {
    type: metadata.originalType,
  })
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Derive key
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as Uint8Array<ArrayBuffer>,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

// Utility functions

function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.subtle !== undefined
  )
}

/**
 * Get encryption info
 */
export function getEncryptionInfo() {
  return {
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    ivLength: IV_LENGTH,
    supported: isEncryptionSupported(),
  }
}

