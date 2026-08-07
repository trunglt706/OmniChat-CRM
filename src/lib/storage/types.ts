export interface StorageFile {
  name: string
  size: number
  lastModified: Date
  url: string
}

export interface StorageStats {
  totalFiles: number
  totalSize: number
  driver: string
}

export interface StorageDriver {
  /**
   * Upload a file to storage
   * @param buffer The file content
   * @param fileName The desired file name
   * @param mimeType The file mime type
   * @returns The public URL of the uploaded file
   */
  upload(buffer: Buffer, fileName: string, mimeType: string): Promise<string>
  
  /**
   * List all files in storage
   */
  list(): Promise<StorageFile[]>
  
  /**
   * Delete a specific file
   * @param fileName The name of the file to delete
   */
  delete(fileName: string): Promise<void>
  
  /**
   * Delete all files
   */
  clear(): Promise<void>
  
  /**
   * Get storage statistics
   */
  getStats(): Promise<StorageStats>
  
  /**
   * Get file content as Buffer
   * @param fileName The file name
   */
  getFileBuffer(fileName: string): Promise<Buffer>
}
