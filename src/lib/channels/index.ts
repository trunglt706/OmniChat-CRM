/**
 * Channel Adapter System — Public API
 *
 * Export mọi thứ cần thiết từ channel adapter system.
 * Các file khác chỉ cần import từ đây.
 *
 * Usage:
 *   import { channelRegistry } from '@/lib/channels'
 *   import type { ChannelType, IChannelAdapter, ParsedWebhookMessage } from '@/lib/channels'
 */

export { channelRegistry } from './registry'

// Types
export type {
  ChannelType,
  IChannelAdapter,
  ChannelMeta,
  ChannelFieldDef,
  TestResult,
  WebhookVerifyResult,
  WebhookHandleResult,
  ParsedWebhookMessage,
  VALID_CHANNEL_TYPES,
} from './types'

export { BaseChannelAdapter } from './types'
