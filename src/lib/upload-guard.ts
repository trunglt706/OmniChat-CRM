/**
 * File upload security validation.
 * Checks: MIME type, Magic Bytes, file size, file count.
 */

import { getSecurityEnv } from './redis'

// Magic bytes (file signatures) for common file types
const MAGIC_BYTES: Record<string, number[]> = {
  // Images
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, 0x57, 0x45, 0x42, 0x50],
  'image/svg+xml': [], // SVG is XML, check for <svg tag
  // Documents
  'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
  'text/csv': [], // Text-based, no reliable magic bytes
  // Office (ZIP-based)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04],
  'application/vnd.ms-excel': [0xD0, 0xCF, 0x11, 0xE0],
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],
  // Audio
  'audio/mpeg': [0xFF, 0xFB] || [0x49, 0x44, 0x33], // ID3
  'audio/wav': [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, 0x57, 0x41, 0x56, 0x45],
  'audio/ogg': [0x4F, 0x67, 0x67, 0x53],
  // Video
  'video/mp4': [0x66, 0x74, 0x79, 0x70], // ftyp
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3],
}

// Alternative magic bytes (some formats have multiple valid signatures)
const ALT_MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'audio/mpeg': [[0xFF, 0xFB], [0x49, 0x44, 0x33]], // ID3 tag
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF...
}

export interface UploadValidationResult {
  valid: boolean
  error?: string
  mimeType?: string
  size?: number
}

/**
 * Validate a single file upload.
 */
export function validateUpload(
  fileName: string,
  declaredMimeType: string | null,
  buffer: ArrayBuffer,
  maxSize?: number
): UploadValidationResult {
  const env = getSecurityEnv()
  const maxBytes = maxSize || env.UPLOAD_MAX_SIZE
  const allowedMimes = env.UPLOAD_ALLOWED_MIME

  // 1. Check file size
  if (buffer.byteLength > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File quá lớn. Tối đa ${maxMB}MB. File: ${(buffer.byteLength / (1024 * 1024)).toFixed(1)}MB`,
      size: buffer.byteLength,
    }
  }

  // 2. Determine actual MIME type from extension if not declared
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const extToMime: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    mp4: 'video/mp4', webm: 'video/webm',
  }
  const extMime = extToMime[ext]
  const candidateMime = declaredMimeType || extMime

  // 3. Check if MIME type is allowed
  if (!candidateMime || !allowedMimes.includes(candidateMime)) {
    return {
      valid: false,
      error: `Loại file không được phép: ${candidateMime || 'unknown'}. Cho phép: ${allowedMimes.join(', ')}`,
    }
  }

  // 4. Magic bytes verification (skip for text-based formats)
  const magicCheck = checkMagicBytes(buffer, candidateMime)
  if (!magicCheck.ok) {
    return {
      valid: false,
      error: magicCheck.error,
      mimeType: candidateMime,
      size: buffer.byteLength,
    }
  }

  // 5. SVG special check: must not contain script tags (XSS prevention)
  if (candidateMime === 'image/svg+xml') {
    const text = new TextDecoder().decode(buffer)
    if (/<script[\s>]/i.test(text) || /on\w+\s*=/i.test(text)) {
      return {
        valid: false,
        error: 'SVG chứa script hoặc event handler không hợp lệ',
        mimeType: candidateMime,
        size: buffer.byteLength,
      }
    }
  }

  return {
    valid: true,
    mimeType: candidateMime,
    size: buffer.byteLength,
  }
}

function checkMagicBytes(buffer: ArrayBuffer, mimeType: string): { ok: boolean; error?: string } {
  // Text-based formats: skip magic byte check
  const skipMagic = ['text/csv', 'image/svg+xml']
  if (skipMagic.includes(mimeType)) return { ok: true }

  const bytes = new Uint8Array(buffer)
  const altSignatures = ALT_MAGIC[mimeType]

  if (altSignatures) {
    const matches = altSignatures.some(sig =>
      sig.every((b, i) => b === undefined || bytes[i] === b)
    )
    if (matches) return { ok: true }
  } else {
    const expected = MAGIC_BYTES[mimeType]
    if (!expected || expected.length === 0) return { ok: true }

    const matches = expected.every((b, i) => b === undefined || bytes[i] === b)
    if (matches) return { ok: true }
  }

  // Magic bytes don't match declared type
  const actualHex = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  return {
    ok: false,
    error: `Magic bytes không khớp MIME type '${mimeType}'. Header: ${actualHex}`,
  }
}

/**
 * Sanitize a filename to prevent directory traversal.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\.{2,}/g, '')       // Remove ..
    .replace(/[/\\]/g, '_')      // Replace path separators
    .replace(/[^a-zA-Z0-9._\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') // Keep safe chars + Vietnamese
    .substring(0, 255)            // Limit length
}
