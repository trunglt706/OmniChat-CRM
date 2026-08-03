/**
 * Channel Adapter Interface — Single Source of Truth
 *
 * Mỗi kênh chat (Facebook, Zalo, Telegram, etc.) cần triển khai interface này.
 * Thiết kế theo Strategy Pattern + Registry Pattern để:
 *   - Thêm kênh mới chỉ cần tạo 1 file adapter mới + đăng ký vào registry
 *   - Mỗi adapter tự quản lý metadata, test connection, webhook verify, webhook handler
 *   - Không cần sửa code ở 7+ nơi như trước
 *
 * Architecture:
 *   BaseChannelAdapter (abstract class)
 *     ├── FacebookMessengerAdapter
 *     ├── FacebookCommentAdapter (extends FacebookMessengerAdapter)
 *     ├── ZaloAdapter
 *     ├── TelegramAdapter
 *     ├── ChatworkAdapter
 *     ├── WebsiteAdapter
 *     └── EmailAdapter
 *
 *   channelRegistry: Map<string, BaseChannelAdapter> — singleton registry
 */

// ─── Common Types ───────────────────────────────────────────────────

/** Kết quả test kết nối */
export interface TestResult {
  ok: boolean
  msg: string
}

/** Kết quả verify webhook signature */
export interface WebhookVerifyResult {
  valid: boolean
  message: string
}

/** Message được parse từ webhook payload */
export interface ParsedWebhookMessage {
  platform: string
  platformMessageId: string | null
  senderId: string | null
  senderName: string | null
  content: string
  messageType: string // text, image, video, audio, file, sticker, location
  attachmentUrl: string | null
  attachmentName: string | null
  attachmentType: string | null
}

/** Kết quả xử lý webhook */
export interface WebhookHandleResult {
  received: number
  messages: ParsedWebhookMessage[]
}

/** Field cấu hình kênh (hiển thị trên UI Settings) */
export interface ChannelFieldDef {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  placeholder: string
}

/** Metadata tĩnh của kênh */
export interface ChannelMeta {
  /** Thứ tự hiển thị trên UI */
  order: number
  /** Tên hiển thị (VD: 'Messenger', 'Zalo') */
  label: string
  /** Màu sắc chủ đạo */
  color: string
  /** Tên icon Lucide (VD: 'MessageCircle') */
  iconName: string
  /** Danh sách field cấu hình */
  fields: ChannelFieldDef[]
  /** Các field không cần điền để xem là 'configured' (VD: widgetId tự sinh) */
  skipConfigCheck?: string[]
}

/** Danh sách channel type hợp lệ */
export const VALID_CHANNEL_TYPES = [
  'website',
  'facebook_messenger',
  'facebook_comment',
  'zalo',
  'telegram',
  'chatwork',
  'email',
] as const

export type ChannelType = (typeof VALID_CHANNEL_TYPES)[number]

// ─── Base Channel Adapter Interface ─────────────────────────────────

/**
 * Interface mà mọi channel adapter phải triển khai.
 * Được thiết kế để dễ dàng thêm kênh mới.
 */
export interface IChannelAdapter {
  /** Unique identifier (VD: 'facebook_messenger') */
  readonly channelType: ChannelType

  /** Static metadata cho UI */
  readonly meta: ChannelMeta

  /**
   * Test kết nối tới platform API.
   * @param config - Credentials đã parse từ DB JSON
   * @returns Kết quả test với message thân thiện
   */
  testConnection(config: Record<string, string>): Promise<TestResult>

  /**
   * Xác thực chữ ký webhook.
   * @param rawBody - Raw request body (string)
   * @param headers - Request headers
   * @param config - Channel config từ DB (chứa secret/key)
   * @returns Kết quả verification
   */
  verifyWebhook(
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult>

  /**
   * Xử lý webhook payload đã được verify.
   * Parse payload thô thành danh sách ParsedWebhookMessage.
   *
   * @param payload - JSON đã parse từ request body
   * @param channel - Sub-channel (VD: 'facebook_messenger' vs 'facebook_comment')
   * @returns Danh sách messages đã chuẩn hóa
   */
  handleWebhook(
    payload: any,
    channel: string
  ): WebhookHandleResult

  /**
   * Xử lý đặc biệt trước khi lưu config vào DB.
   * VD: tự sinh widgetId cho website, validate format.
   *
   * @param config - Config từ user input
   * @returns Config đã xử lý (có thể thêm/trường field)
   */
  preprocessConfig?(config: Record<string, string>): Record<string, string>

  /**
   * Gửi tin nhắn tới platform (outbound).
   * Chưa triển khai — placeholder cho tương lai.
   *
   * @param to - Recipient ID trên platform
   * @param message - Nội dung tin nhắn
   * @param config - Channel credentials
   * @returns Platform message ID nếu thành công
   */
  sendMessage?(
    to: string,
    message: { content: string; messageType?: string; attachmentUrl?: string },
    config: Record<string, string>
  ): Promise<{ platformMessageId: string } | { error: string }>
}

/**
 * Abstract base class cung cấp helper methods chung.
 * Các adapter cụ thể thừa kế và override các method cần thiết.
 */
export abstract class BaseChannelAdapter implements IChannelAdapter {
  abstract readonly channelType: ChannelType
  abstract readonly meta: ChannelMeta

  abstract testConnection(config: Record<string, string>): Promise<TestResult>
  abstract verifyWebhook(
    rawBody: string,
    headers: Headers,
    config: Record<string, string>
  ): Promise<WebhookVerifyResult>
  abstract handleWebhook(payload: any, channel: string): WebhookHandleResult

  /** Default: no preprocessing */
  preprocessConfig(config: Record<string, string>): Record<string, string> {
    return config
  }

  // ─── Shared Helpers ─────────────────────────────────────────────

  /** fetch với timeout mặc định 10s */
  protected async fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    timeoutMs = 10_000
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  /** Tạo TestResult lỗi từ exception */
  protected testError(e: unknown, platform: string): TestResult {
    const msg = (e as Error).message || ''
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, msg: `${platform} API timeout - Kiểm tra lại kết nối mạng` }
    }
    return { ok: false, msg: `Lỗi kết nối: ${msg}` }
  }
}
