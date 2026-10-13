import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve, sep } from 'node:path'
import { decrypt, encrypt } from '../../utils/crypto'
import { AppError } from '../../middleware/errorHandler'

/**
 * Stores KYC documents encrypted at rest (AES-256-GCM via utils/crypto).
 *
 * The default implementation writes to KYC_STORAGE_DIR. On Railway the container
 * filesystem is ephemeral, so mount a volume there (or swap in an S3-compatible
 * implementation of DocumentStore) before relying on this in production.
 */
export interface DocumentStore {
  put(bytes: Buffer): Promise<string>        // returns an opaque storage key
  get(storageKey: string): Promise<Buffer>
}

export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024

export type DocumentMime = 'image/jpeg' | 'image/png' | 'application/pdf'

/** Decodes base64 and checks size and magic bytes. Never trusts a client-supplied type. */
export function parseDocument(base64: string, allowPdf = false): { bytes: Buffer; mime: DocumentMime } {
  if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new AppError(400, 'Document is not valid base64.', 'INVALID_DOCUMENT')
  }
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) {
    throw new AppError(400, 'Each document must be 3MB or smaller.', 'INVALID_DOCUMENT')
  }
  let mime: DocumentMime | null = null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg'
  else if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) mime = 'image/png'
  else if (allowPdf && bytes.subarray(0, 4).toString('latin1') === '%PDF') mime = 'application/pdf'
  if (!mime) throw new AppError(400, allowPdf ? 'Use a JPEG, PNG or PDF file.' : 'Use a JPEG or PNG image.', 'INVALID_DOCUMENT')
  return { bytes, mime }
}

export class EncryptedDiskStore implements DocumentStore {
  private dir() { return resolve(process.env.KYC_STORAGE_DIR ?? './kyc-storage') }

  async put(bytes: Buffer): Promise<string> {
    const key = randomUUID()
    await mkdir(this.dir(), { recursive: true })
    await writeFile(resolve(this.dir(), key), encrypt(bytes.toString('base64')), { mode: 0o600 })
    return key
  }

  async get(storageKey: string): Promise<Buffer> {
    if (!/^[0-9a-f-]{36}$/.test(storageKey)) throw new AppError(400, 'Invalid document key.', 'INVALID_DOCUMENT')
    const path = resolve(this.dir(), storageKey)
    if (!path.startsWith(this.dir() + sep)) throw new AppError(400, 'Invalid document key.', 'INVALID_DOCUMENT')
    return Buffer.from(decrypt(await readFile(path, 'utf8')), 'base64')
  }
}

export const documentStore: DocumentStore = new EncryptedDiskStore()
