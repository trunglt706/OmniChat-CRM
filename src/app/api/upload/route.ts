import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getAuthUser } from '@/lib/session'
import { validateUpload, sanitizeFileName } from '@/lib/upload-guard'
import { getSecurityEnv } from '@/lib/redis'
import { setIdempotencyResult, extractIdempotencyKey, getIdempotencyResult, idempotencyResponse } from '@/lib/idempotency'

const UPLOAD_DIR = join(process.cwd(), 'data', 'uploads')

/**
 * POST /api/upload
 * Upload one or more files with security validation.
 *
 * Headers:
 *   - Cookie: next-auth.session-token (auth)
 *   - Idempotency-Key: (optional) for dedup
 *
 * Body: FormData with file fields
 */
export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Idempotency check
  const idemKey = extractIdempotencyKey(request)
  if (idemKey) {
    const cached = await getIdempotencyResult(idemKey)
    if (cached) return idempotencyResponse(cached)
  }

  try {
    const formData = await request.formData()
    const env = getSecurityEnv()
    const files = formData.getAll('files') as File[]

    // Validate file count
    if (files.length === 0) {
      return NextResponse.json({ error: 'Không có file nào' }, { status: 400 })
    }
    if (files.length > env.UPLOAD_MAX_FILES) {
      return NextResponse.json(
        { error: `Tối đa ${env.UPLOAD_MAX_FILES} files mỗi lần upload` },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Process each file
    const results = []
    for (const file of files) {
      const buffer = await file.arrayBuffer()
      const declaredType = file.type || null

      // Security validation
      const validation = validateUpload(file.name, declaredType, buffer)
      if (!validation.valid) {
        results.push({
          file: file.name,
          ok: false,
          error: validation.error,
        })
        continue
      }

      // Sanitize filename
      const safeName = sanitizeFileName(file.name)
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
      const filePath = join(UPLOAD_DIR, uniqueName)

      // Write file
      await writeFile(filePath, Buffer.from(buffer))

      results.push({
        file: file.name,
        ok: true,
        url: `/uploads/${uniqueName}`,
        mimeType: validation.mimeType,
        size: validation.size,
      })
    }

    const hasErrors = results.some(r => !r.ok)
    const response = NextResponse.json(
      {
        uploaded: results.filter(r => r.ok),
        errors: results.filter(r => !r.ok),
      },
      { status: hasErrors ? 207 : 200 }
    )

    // Cache for idempotency
    if (idemKey) {
      await setIdempotencyResult(idemKey, response.status, response.headers, await response.json())
    }

    return response
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json(
      { error: 'Lỗi xử lý upload' },
      { status: 500 }
    )
  }
}
