import { StorageDriver, StorageFile, StorageStats } from './types'
import { writeFile, mkdir, readdir, stat, unlink, rm } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

export class LocalDriver implements StorageDriver {
  private uploadsDir: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    this.init()
  }

  private async init() {
    try {
      await mkdir(this.uploadsDir, { recursive: true })
    } catch (e) {
      // Ignore if exists
    }
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    await this.init()
    const filePath = path.join(this.uploadsDir, fileName)
    await writeFile(filePath, buffer)
    return `/uploads/${fileName}`
  }

  async getFileBuffer(fileName: string): Promise<Buffer> {
    const { readFile } = await import('fs/promises')
    const filePath = path.join(this.uploadsDir, fileName)
    return await readFile(filePath)
  }

  async list(): Promise<StorageFile[]> {
    await this.init()
    const files: StorageFile[] = []
    try {
      const entries = await readdir(this.uploadsDir)
      for (const entry of entries) {
        if (entry.startsWith('.')) continue
        const filePath = path.join(this.uploadsDir, entry)
        const stats = await stat(filePath)
        if (stats.isFile()) {
          files.push({
            name: entry,
            size: stats.size,
            lastModified: stats.mtime,
            url: `/uploads/${entry}`
          })
        }
      }
    } catch (e) {
      logger.error('Error listing local files', 'LocalDriver', { error: String(e) })
    }
    // Sort by lastModified desc
    return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
  }

  async delete(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadsDir, fileName)
      await unlink(filePath)
    } catch (e) {
      logger.error(`Error deleting file ${fileName}`, 'LocalDriver', { error: String(e) })
    }
  }

  async clear(): Promise<void> {
    try {
      await rm(this.uploadsDir, { recursive: true, force: true })
      await this.init()
    } catch (e) {
      logger.error('Error clearing local files', 'LocalDriver', { error: String(e) })
    }
  }

  async getStats(): Promise<StorageStats> {
    const files = await this.list()
    const totalSize = files.reduce((acc, file) => acc + file.size, 0)
    return {
      totalFiles: files.length,
      totalSize,
      driver: 'file'
    }
  }
}
