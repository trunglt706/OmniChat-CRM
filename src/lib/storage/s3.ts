import { StorageDriver, StorageFile, StorageStats } from './types'
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { logger } from '@/lib/logger'

export class S3Driver implements StorageDriver {
  private client: S3Client
  private bucket: string
  private region: string

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1'
    this.bucket = process.env.AWS_S3_BUCKET || ''
    
    if (!this.bucket) {
      logger.warn('AWS_S3_BUCKET is not set. S3 driver may fail.', 'S3Driver')
    }

    const endpoint = process.env.AWS_S3_ENDPOINT
    
    this.client = new S3Client({
      region: this.region,
      endpoint: endpoint ? endpoint : undefined,
      forcePathStyle: !!endpoint, // Required for minio/r2
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    })
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
      })
      await this.client.send(command)
      
      // Assume public read access or CloudFront/R2 public URL mapping
      const endpoint = process.env.AWS_S3_ENDPOINT
      if (endpoint) {
         // Generate public URL for custom endpoint (like Minio or R2 if configured with public bucket)
         // Note: in a real world scenario, you might have a CDN domain.
         // We will just return the generic s3 url or endpoint url.
         const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
         return `${cleanEndpoint}/${this.bucket}/${fileName}`
      }
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`
    } catch (e) {
      logger.error(`Error uploading to S3: ${fileName}`, 'S3Driver', e)
      throw e
    }
  }

  async getFileBuffer(fileName: string): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
    })
    const response = await this.client.send(command)
    if (!response.Body) {
      throw new Error(`File not found: ${fileName}`)
    }
    const byteArray = await response.Body.transformToByteArray()
    return Buffer.from(byteArray)
  }

  async list(): Promise<StorageFile[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
      })
      const response = await this.client.send(command)
      const files: StorageFile[] = []
      
      if (response.Contents) {
        for (const item of response.Contents) {
          if (!item.Key) continue
          
          let url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${item.Key}`
          const endpoint = process.env.AWS_S3_ENDPOINT
          if (endpoint) {
             const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
             url = `${cleanEndpoint}/${this.bucket}/${item.Key}`
          }

          files.push({
            name: item.Key,
            size: item.Size || 0,
            lastModified: item.LastModified || new Date(),
            url
          })
        }
      }
      
      return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    } catch (e) {
      logger.error('Error listing S3 files', 'S3Driver', e)
      return []
    }
  }

  async delete(fileName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
      })
      await this.client.send(command)
    } catch (e) {
      logger.error(`Error deleting file ${fileName}`, 'S3Driver', e)
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await this.list()
      if (files.length === 0) return

      // S3 DeleteObjects accepts max 1000 keys per request. For simplicity, we chunk it or delete one by one if few.
      const keys = files.map(f => ({ Key: f.name }))
      
      for (let i = 0; i < keys.length; i += 1000) {
        const chunk = keys.slice(i, i + 1000)
        const command = new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk
          }
        })
        await this.client.send(command)
      }
    } catch (e) {
      logger.error('Error clearing S3 files', 'S3Driver', e)
    }
  }

  async getStats(): Promise<StorageStats> {
    const files = await this.list()
    const totalSize = files.reduce((acc, file) => acc + file.size, 0)
    return {
      totalFiles: files.length,
      totalSize,
      driver: 's3'
    }
  }
}
