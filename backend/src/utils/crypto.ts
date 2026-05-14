import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/** Deterministic idempotency key from an order ID */
export function generateIdempotencyKey(orderId: string): string {
  return crypto.createHash('sha256').update(orderId).digest('hex')
}

/** AES-256-GCM encrypt — for storing sensitive data at rest */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'utf8').slice(0, 32)
  const iv  = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag       = cipher.getAuthTag()

  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

/** AES-256-GCM decrypt */
export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  const key     = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'utf8').slice(0, 32)
  const iv      = Buffer.from(ivHex, 'hex')
  const tag     = Buffer.from(tagHex, 'hex')
  const enc     = Buffer.from(encHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(enc).toString('utf8') + decipher.final('utf8')
}

/** Verify a Flutterwave/Paystack webhook signature */
export function verifyHmac(
  payload: string | Buffer,
  secret: string,
  receivedSig: string,
  algorithm: 'sha256' | 'sha512' = 'sha256',
): boolean {
  const computed = crypto.createHmac(algorithm, secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedSig))
}
