/**
 * Channel Adapter Registry — Singleton
 *
 * Mỗi kênh đăng ký adapter của mình vào registry.
 * Code khác chỉ cần import `channelRegistry` để truy cập mọi kênh.
 *
 * Cách thêm kênh mới:
 *   1. Tạo file adapter mới trong src/lib/channels/adapters/
 *   2. Triển khai IChannelAdapter (hoặc extend BaseChannelAdapter)
 *   3. Import và đăng ký ở cuối file này
 *
 * Cách sử dụng:
 *   import { channelRegistry } from '@/lib/channels/registry'
 *   const adapter = channelRegistry.get('zalo')
 *   const result = await adapter?.testConnection(config)
 */

import type {
  IChannelAdapter,
  ChannelType,
  ChannelMeta,
  ChannelFieldDef,
  TestResult,
  WebhookVerifyResult,
  WebhookHandleResult,
} from './types'

import { FacebookMessengerAdapter } from './adapters/facebook-messenger'
import { FacebookCommentAdapter } from './adapters/facebook-comment'
import { ZaloAdapter } from './adapters/zalo'
import { TelegramAdapter } from './adapters/telegram'
import { ChatworkAdapter } from './adapters/chatwork'
import { WebsiteAdapter } from './adapters/website'
import { EmailAdapter } from './adapters/email'

// ─── Registry ───────────────────────────────────────────────────────

class ChannelRegistry {
  private readonly _adapters = new Map<ChannelType, IChannelAdapter>()

  /** Đăng ký một adapter */
  register(adapter: IChannelAdapter): void {
    this._adapters.set(adapter.channelType, adapter)
  }

  /** Lấy adapter theo channel type */
  get(channelType: string): IChannelAdapter | undefined {
    return this._adapters.get(channelType as ChannelType)
  }

  /** Kiểm tra channel có tồn tại không */
  has(channelType: string): boolean {
    return this._adapters.has(channelType as ChannelType)
  }

  /** Danh sách tất cả adapters, sắp xếp theo order */
  getAll(): IChannelAdapter[] {
    return Array.from(this._adapters.values()).sort((a, b) => a.meta.order - b.meta.order)
  }

  /** Danh sách tất cả channel types */
  getChannelTypes(): ChannelType[] {
    return this.getAll().map(a => a.channelType)
  }

  /** Lấy metadata cho tất cả kênh (cho UI) */
  getAllMeta(): (ChannelMeta & { channelType: ChannelType })[] {
    return this.getAll().map(a => ({
      channelType: a.channelType,
      ...a.meta,
    }))
  }

  /** Lấy field definitions cho một kênh */
  getFields(channelType: string): ChannelFieldDef[] {
    return this.get(channelType)?.meta.fields || []
  }

  /** Test kết nối một kênh */
  async testConnection(channelType: string, config: Record<string, string>): Promise<TestResult> {
    const adapter = this.get(channelType)
    if (!adapter) {
      return { ok: false, msg: `Kênh '${channelType}' không được hỗ trợ` }
    }
    return adapter.testConnection(config)
  }

  /** Verify webhook */
  async verifyWebhook(
    channelType: string,
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult> {
    const adapter = this.get(channelType)
    if (!adapter) {
      return { valid: false, message: `Kênh '${channelType}' không được hỗ trợ` }
    }
    return adapter.verifyWebhook(rawBody, headers, config)
  }

  /** Xử lý webhook payload */
  handleWebhook(channelType: string, payload: any, channel: string): WebhookHandleResult {
    const adapter = this.get(channelType)
    if (!adapter) {
      return { received: 0, messages: [] }
    }
    return adapter.handleWebhook(payload, channel)
  }

  /** Preprocess config trước khi lưu */
  preprocessConfig(channelType: string, config: Record<string, string>): Record<string, string> {
    const adapter = this.get(channelType)
    if (!adapter) return config
    return adapter.preprocessConfig ? adapter.preprocessConfig(config) : config
  }
}

// ─── Khởi tạo & Đăng ký ────────────────────────────────────────────

const registry = new ChannelRegistry()

registry.register(new FacebookMessengerAdapter())
registry.register(new FacebookCommentAdapter())
registry.register(new ZaloAdapter())
registry.register(new TelegramAdapter())
registry.register(new ChatworkAdapter())
registry.register(new WebsiteAdapter())
registry.register(new EmailAdapter())

/** Singleton registry — import này ở mọi nơi cần tương tác với channels */
export const channelRegistry = registry
