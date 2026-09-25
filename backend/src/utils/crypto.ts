import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function keyFrom(value: string): Buffer {
  const key = Buffer.from(value, 'hex')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must contain exactly 32 bytes (64 hex characters)')
  return key
}

export function encrypt(plainText: string, encryptionKey: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, keyFrom(encryptionKey), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.')
}

export function decrypt(payload: string, encryptionKey: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split('.')
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid encrypted value')
  const decipher = createDecipheriv(ALGORITHM, keyFrom(encryptionKey), Buffer.from(ivValue, 'base64'))
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64')), decipher.final()]).toString('utf8')
}
