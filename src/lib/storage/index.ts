import { StorageDriver } from './types'
import { LocalDriver } from './local'
import { S3Driver } from './s3'
import { logger } from '@/lib/logger'

let _driver: StorageDriver | null = null

/**
 * Get the current storage driver based on configuration
 */
export function getStorageDriver(): StorageDriver {
  if (_driver) return _driver

  const driverType = process.env.STORAGE_DRIVER || 'file'

  if (driverType === 's3') {
    _driver = new S3Driver()
    logger.info('Initialized S3 Storage Driver', 'Storage')
  } else {
    _driver = new LocalDriver()
    logger.info('Initialized Local Storage Driver', 'Storage')
  }

  return _driver as StorageDriver
}

/**
 * Get a specific storage driver (useful for syncing)
 */
export function getSpecificDriver(type: 'file' | 's3'): StorageDriver {
  return type === 's3' ? new S3Driver() : new LocalDriver()
}

export * from './types'
