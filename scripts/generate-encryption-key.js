#!/usr/bin/env node

/**
 * Generate Encryption Key Script
 * 
 * Run this once to generate a secure encryption key
 * Add the output to your .env file as ENCRYPTION_KEY
 */

const crypto = require('crypto')

const KEY_LENGTH = 32 // 256 bits for AES-256

console.log('🔐 Generating AES-256 Encryption Key...\n')

// Generate random key
const key = crypto.randomBytes(KEY_LENGTH)
const keyBase64 = key.toString('base64')

console.log('✅ Encryption key generated successfully!\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('📝 Add this to your .env file:\n')
console.log(`ENCRYPTION_KEY=${keyBase64}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

console.log('⚠️  SECURITY WARNINGS:')
console.log('   1. NEVER commit this key to version control')
console.log('   2. Store it securely (password manager, secrets vault)')
console.log('   3. Use different keys for development and production')
console.log('   4. Keep a backup in a secure location')
console.log('   5. Rotate keys periodically (yearly recommended)\n')

console.log('📊 Key Information:')
console.log(`   Algorithm: AES-256-GCM`)
console.log(`   Key Length: ${KEY_LENGTH} bytes (${KEY_LENGTH * 8} bits)`)
console.log(`   Format: Base64`)
console.log(`   Strength: Military-grade\n`)

// Test the key
try {
  const testData = Buffer.from('encryption test')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(testData), cipher.final()])
  const tag = cipher.getAuthTag()
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  
  if (testData.equals(decrypted)) {
    console.log('✅ Key validation: PASSED\n')
  } else {
    console.error('❌ Key validation: FAILED\n')
    process.exit(1)
  }
} catch (error) {
  console.error('❌ Key validation error:', error.message, '\n')
  process.exit(1)
}

console.log('🎉 Setup complete! Your data will be encrypted with military-grade AES-256 encryption.')

