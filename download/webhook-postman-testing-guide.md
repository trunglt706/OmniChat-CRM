# Hướng dẫn Test Webhook nhận tin nhắn từ các Channel đồng bộ về CRM

## Tài liệu kỹ thuật - OmniChat CRM

---

## Mục lục

1. [Tổng quan kiến trúc Webhook](#1-tổng-quan-kiến-trúc-webhook)
2. [Cài đặt Postman Collection](#2-cài-đặt-postman-collection)
3. [Chuẩn bị môi trường](#3-chuẩn-bị-môi-trường)
4. [Chi tiết payload từng Channel](#4-chi-tiết-payload-từng-channel)
5. [Test các trường hợp lỗi](#5-test-các-trường-hợp-lỗi)
6. [Ghi chú quan trọng - Gap CRM Sync](#6-ghi-chú-quan-trọng---gap-crm-sync)
7. [Appendix: Pre-request Script giải thích](#7-appendix-pre-request-script-giải-thích)

---

## 1. Tổng quan kiến trúc Webhook

### 1.1 Luồng xử lý hiện tại

```
Platform (FB/Zalo/TG/...)
  → POST /api/webhook/[channel]
    → proxy.ts: BỎ QUA auth/CSRF/rate-limit (public path)
    → route.ts: Đọc rawBody, tải ChannelConfig từ DB
    → channelRegistry.verifyWebhook(channel, rawBody, headers, config)
      → adapter.verifyWebhook() — HMAC-SHA256 hoặc platform-specific
    → channelRegistry.handleWebhook(channel, payload, channel)
      → adapter.handleWebhook() — Trả về ParsedWebhookMessage[]
    → Trả về { received: N, messages: [...] } như JSON response
```

### 1.2 Endpoint chung

| Phương thức | URL | Mô tả |
|---|---|---|
| `POST` | `/api/webhook/{channel}` | Nhận webhook từ platform |
| `GET` | `/api/channels` | Lấy danh sách channels + config |
| `PUT` | `/api/channels` | Cập nhật channel config |

### 1.3 Danh sách channel và header verification

| Channel | URL Path | Signature Header | Thuật toán |
|---|---|---|---|
| Facebook Messenger | `/api/webhook/facebook_messenger` | `X-Hub-Signature-256` | HMAC-SHA256(appSecret, rawBody) |
| Facebook Comment | `/api/webhook/facebook_comment` | `X-Hub-Signature-256` | HMAC-SHA256(appSecret, rawBody) |
| Zalo OA | `/api/webhook/zalo` | `X-Zalo-Signature` | HMAC-SHA256(appSecret, rawBody) |
| Telegram Bot | `/api/webhook/telegram` | (trong body: `secret_token`) | So sánh secret_token trong payload |
| Chatwork | `/api/webhook/chatwork` | `X-ChatWorkWebhookSignature` | HMAC-SHA256(apiToken, rawBody) |
| Website Widget | `/api/webhook/website` | `X-Webhook-Signature` + `X-Webhook-Timestamp` | HMAC-SHA256(secret, timestamp.rawBody) |
| Email | `/api/webhook/email` | (Không có) | Luôn pass (không verify) |

### 1.4 Cấu trúc response webhook thành công

```json
{
  "received": 1,
  "messages": [
    {
      "platform": "facebook_messenger",
      "platformMessageId": "m_xxxxx",
      "senderId": "123456789",
      "senderName": null,
      "content": "Xin chào, tôi cần hỗ trợ",
      "messageType": "text",
      "attachmentUrl": null,
      "attachmentName": null,
      "attachmentType": null
    }
  ]
}
```

---

## 2. Cài đặt Postman Collection

### 2.1 Import collection

1. Mở Postman → Import → Raw text
2. Copy toàn bộ JSON từ file `omnichat-webhook-collection.json` (đính kèm) dán vào
3. Lưu với tên **"OmniChat Webhook Testing"**

### 2.2 Cấu hình biến môi trường

Collection đã chứa 6 biến mặc định. Cập nhật `base_url` cho đúng môi trường:

| Biến | Giá trị mặc định | Mô tả |
|---|---|---|
| `base_url` | `http://localhost:3000` | URL server OmniChat |
| `fb_app_secret` | `test_app_secret_123` | Facebook App Secret (phải khớp DB) |
| `zalo_app_secret` | `test_zalo_secret_456` | Zalo App Secret (phải khớp DB) |
| `telegram_secret` | `test_telegram_secret_789` | Telegram secret_token (phải khớp DB) |
| `chatwork_token` | `test_chatwork_token_abc` | Chatwork API Token (phải khớp DB) |
| `webhook_secret` | `test_webhook_secret_xyz` | Website webhook secret (phải khớp DB) |

**Lưu ý quan trọng:** Các giá trị secret/token ở trên PHẢI khớp với giá trị đã lưu trong database `ChannelConfig` cho từng channel. Nếu không khớp, signature verification sẽ thất bại với mã `401`.

### 2.3 Cấu trúc collection

```
OmniChat Webhook Testing
├── 0. Setup - Channel Config
│   ├── Get All Channels
│   ├── Setup FB Messenger Config
│   ├── Setup Zalo Config
│   ├── Setup Telegram Config
│   ├── Setup Chatwork Config
│   └── Setup Website Config
├── 1. Facebook Messenger
│   ├── Text Message
│   ├── Image Attachment
│   └── Multiple Messages (batch)
├── 2. Facebook Comment
│   ├── Comment on Post
│   └── Comment with Attachment
├── 3. Zalo OA
│   ├── Text Message
│   └── Multiple Zalo Messages
├── 4. Telegram Bot
│   ├── Text Message
│   ├── Photo Message
│   └── Document/File Message
├── 5. Chatwork
│   ├── Message in Room
│   └── Mention Message
├── 6. Website Widget
│   ├── Visitor Text Message
│   └── Visitor File Upload
├── 7. Email
│   ├── Customer Email
│   └── Email with Attachment
└── 8. Error Cases
    ├── Unsupported Channel
    ├── Invalid Signature (FB)
    ├── Missing Signature Header (Zalo)
    ├── Invalid JSON Payload
    ├── Expired Timestamp (Website)
    └── Wrong Telegram secret_token
```

---

## 3. Chuẩn bị môi trường

### 3.1 Khởi động server

```bash
cd /home/z/my-project
npm run dev
# hoặc
npx next dev --turbopack --max-old-space-size=1200
```

Server chạy tại `http://localhost:3000`.

### 3.2 Thiết lập channel config qua API

**Bước bắt buộc:** Trước khi test webhook, phải lưu config cho từng channel vào DB. Các request Setup trong folder "0. Setup - Channel Config" đã thực hiện việc này.

**Thứ tự thực hiện:**

1. Chạy **"Get All Channels"** → Xem danh sách 7 channels và config hiện tại
2. Chạy từng request **"Setup X Config"** → Lưu credentials giả lập vào DB
3. Sau khi setup xong, mới chạy test webhook tương ứng

### 3.3 Xác nhận proxy bypass

Webhook routes đã được khai báo trong `proxy.ts` sebagai `PUBLIC_PATHS`:

```typescript
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/webhook', '/api/ws/test', '/api/realtime/test']
```

Điều này có nghĩa là:
- **Không cần login** để gọi `/api/webhook/*`
- **Không cần CSRF token** cho POST request
- **Không bị rate limit** cho webhook routes

---

## 4. Chi tiết payload từng Channel

### 4.1 Facebook Messenger

**Endpoint:** `POST /api/webhook/facebook_messenger`

**Signature:** Header `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(appSecret, rawBody)

**Payload - Tin nhắn văn bản:**

```json
{
  "object": "page",
  "entry": [
    {
      "id": "987654321098765",
      "time": 1722672000000,
      "messaging": [
        {
          "sender": { "id": "112233445566778" },
          "recipient": { "id": "987654321098765" },
          "timestamp": 1722672000000,
          "message": {
            "mid": "m_001_abc123def456",
            "text": "Xin chào, tôi cần hỗ trợ về đơn hàng DH2024001"
          }
        }
      ]
    }
  ]
}
```

**Payload - Tin nhắn có ảnh đính kèm:**

```json
{
  "object": "page",
  "entry": [
    {
      "id": "987654321098765",
      "time": 1722672000000,
      "messaging": [
        {
          "sender": { "id": "112233445566778" },
          "recipient": { "id": "987654321098765" },
          "timestamp": 1722672000000,
          "message": {
            "mid": "m_002_img789xyz",
            "attachments": [
              {
                "type": "image",
                "payload": {
                  "url": "https://example.com/photo.jpg",
                  "name": "anh_san_pham.jpg"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Response mong đợi:**

```json
{
  "received": 1,
  "messages": [
    {
      "platform": "facebook_messenger",
      "platformMessageId": "m_001_abc123def456",
      "senderId": "112233445566778",
      "senderName": null,
      "content": "Xin chào, tôi cần hỗ trợ về đơn hàng DH2024001",
      "messageType": "text",
      "attachmentUrl": null,
      "attachmentName": null,
      "attachmentType": null
    }
  ]
}
```

**Lưu ý về adapter:**
- Adapter parse `payload.entry[].messaging[]` → flatMap thành danh sách messages
- Hỗ trợ batch: một entry có thể chứa nhiều messaging events
- `messageType` tự động nhận dạng từ `attachments[0].type` (image/video/audio/file)
- `senderName` luôn là `null` vì Facebook messaging webhook không trả về tên người gửi

---

### 4.2 Facebook Comment

**Endpoint:** `POST /api/webhook/facebook_comment`

**Signature:** Giống Facebook Messenger — Header `X-Hub-Signature-256`

**Payload - Comment trên bài viết:**

```json
{
  "object": "page",
  "entry": [
    {
      "id": "987654321098765",
      "time": 1722672000000,
      "changes": [
        {
          "field": "feed",
          "value": {
            "comment_id": "112233445566778_001",
            "from": {
              "id": "445566778899001",
              "name": "Nguyễn Văn A"
            },
            "message": "Sản phẩm bên bạn có bảo hành không ạ?",
            "post_id": "987654321098765_100",
            "created_time": 1722672000000
          }
        }
      ]
    }
  ]
}
```

**Khác biệt với Messenger:**
- Dùng `changes[]` thay vì `messaging[]`
- `value.comment_id` thay vì `message.mid`
- `value.from.name` CÓ giá trị (khác với Messenger)
- `value.attachment_url` cho comment có hình/ file

---

### 4.3 Zalo OA

**Endpoint:** `POST /api/webhook/zalo`

**Signature:** Header `X-Zalo-Signature` = HMAC-SHA256(appSecret, rawBody)

**Payload - Tin nhắn văn bản:**

```json
{
  "data": [
    {
      "message_id": "zalo_msg_001",
      "user_id_by_app": "zalo_user_12345",
      "from": {
        "user_id": "zalo_user_12345"
      },
      "message": {
        "msg_id": "zalo_msg_001",
        "content": "Cho tôi hỏi thông tin liên hệ của shop"
      },
      "timestamp": 1722672000000
    }
  ]
}
```

**Lưu ý:**
- Zalo payload bọc trong mảng `data[]`
- `senderId` lấy từ `user_id_by_app` hoặc `from.user_id`
- `content` lấy từ `message.content` hoặc `content` cấp cao nhất
- Hỗ trợ batch: mảng `data` có thể chứa nhiều tin nhắn

---

### 4.4 Telegram Bot

**Endpoint:** `POST /api/webhook/telegram`

**Signature:** Khác biệt — `secret_token` nằm TRONG body payload, không phải header.

**Payload - Tin nhắn văn bản:**

```json
{
  "update_id": 100000001,
  "message": {
    "message_id": 5001,
    "from": {
      "id": 123456789,
      "is_bot": false,
      "first_name": "John",
      "username": "johndoe"
    },
    "chat": {
      "id": 123456789,
      "first_name": "John",
      "type": "private"
    },
    "date": 1722672000,
    "text": "Hello, I need help with my order",
    "secret_token": "test_telegram_secret_789"
  }
}
```

**Payload - Tin nhắn có ảnh:**

```json
{
  "update_id": 100000002,
  "message": {
    "message_id": 5002,
    "from": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "Jane"
    },
    "chat": {
      "id": 987654321,
      "first_name": "Jane",
      "type": "private"
    },
    "date": 1722672100,
    "photo": [
      {
        "file_id": "AbcDefGhIJKL",
        "file_unique_id": "xyz789",
        "width": 800,
        "height": 600
      }
    ],
    "caption": "Ảnh sản phẩm bị lỗi, tôi muốn đổi mới",
    "secret_token": "test_telegram_secret_789"
  }
}
```

**Lưu ý quan trọng về Telegram adapter:**
- `secret_token` PHẢI nằm trong `message` object, giá trị phải khớp với `webhookSecret` hoặc `verifyToken` trong DB config
- Adapter hiện tại map `payload.result[]` (mảng), nhưng Telegram gửi `{ update_id, message: {...} }` trực tiếp, KHÔNG bọc trong `result` array. Đây là **bug cần sửa**.
- `messageType`: photo → "image", video → "video", document → dùng `file_url` làm `attachmentUrl`
- `platformMessageId` = `String(message.message_id)`

---

### 4.5 Chatwork

**Endpoint:** `POST /api/webhook/chatwork`

**Signature:** Header `X-ChatWorkWebhookSignature` = HMAC-SHA256(apiToken, rawBody)

**Payload - Tin nhắn trong room:**

```json
{
  "webhook_event": {
    "message_id": "cw_msg_001",
    "room_id": 12345678,
    "from_account_id": 999888777,
    "body": "Xin chào, tôi cần hỗ trợ về dịch vụ",
    "send_time": 1722672000,
    "update_time": 1722672000
  },
  "webhook_event_id": 1
}
```

**Lưu ý:**
- Chatwork webhook chỉ trả về 1 message mỗi request (không batch)
- `senderId` = `String(webhook_event.from_account_id)`
- `senderName` = `null` (webhook không trả tên)
- `content` lấy từ `webhook_event.body` (có thể chứa Chatwork markup như `[To:xxx]`)

---

### 4.6 Website Widget

**Endpoint:** `POST /api/webhook/website`

**Signature:** Khác biệt — dùng timestamp + HMAC:

1. Header `X-Webhook-Timestamp` = Unix timestamp (giây)
2. Header `X-Webhook-Signature` = HMAC-SHA256(secret, `{timestamp}.{rawBody}`)
3. Timestamp phải trong tolerance 300s (5 phút) so với server time

**Payload - Tin nhắn văn bản từ visitor:**

```json
{
  "messageId": "web_msg_001",
  "visitorId": "vis_abc123def456",
  "visitorName": "Khách vãng lai",
  "content": "Xin chào, tôi cần hỗ trợ về đơn hàng",
  "type": "text"
}
```

**Payload - File upload từ visitor:**

```json
{
  "messageId": "web_msg_002",
  "visitorId": "vis_xyz789uvw012",
  "visitorName": "Nguyễn Văn C",
  "content": "",
  "type": "file",
  "attachmentUrl": "https://example.com/invoice.pdf",
  "attachmentName": "hoadon.pdf",
  "attachmentType": "application/pdf"
}
```

**Lưu ý:**
- Signature gồm 2 phần: `timestamp` và `rawBody` được nối bằng dấu `.`
- Pre-request script tự động tính timestamp hiện tại và tạo signature
- Nếu timestamp quá cũ (>300s), verification sẽ fail
- `webhookSecret` lấy từ DB config hoặc fallback về `WEBHOOK_SECRET` trong `.env`

---

### 4.7 Email

**Endpoint:** `POST /api/webhook/email`

**Signature:** KHÔNG CÓ verification — luôn return `{ valid: true }`

**Payload - Email từ khách hàng:**

```json
{
  "messageId": "email_msg_001",
  "id": "<abc123@example.com>",
  "from": "customer@gmail.com",
  "fromName": "Lê Văn D",
  "subject": "Phản hồi về dịch vụ",
  "text": "Kính gửi bộ phận CSKH, tôi muốn phản hồi về dịch vụ đơn hàng #DH2024-0891. Sản phẩm nhận được không đúng với mô tả trên website. Tôi yêu cầu đổi mới hoặc hoàn tiền.",
  "body": "Kính gửi bộ phận CSKH, tôi muốn phản hồi về dịch vụ.",
  "hasAttachments": false
}
```

**Lưu ý:**
- Email là channel duy nhất KHÔNG có signature verification
- Trong production nên dùng SPF/DKIM/DMARC check (chưa triển khai)
- `senderId` = `payload.from` (địa chỉ email)
- `senderName` = `payload.fromName`
- `attachmentName` = `payload.subject` (lấy subject làm tên đính kèm)
- `messageType` = "file" nếu `hasAttachments: true`, ngược lại "text"

---

## 5. Test các trường hợp lỗi

### 5.1 Bảng test case tổng hợp

| # | Test Case | Channel | Kết quả mong đợi | HTTP Status |
|---|---|---|---|---|
| E1 | Channel không hỗ trợ | `/api/webhook/unsupported_channel` | `"Kênh '...' không được hỗ trợ"` | 400 |
| E2 | Signature không hợp lệ (FB) | `facebook_messenger` | `"Signature không hợp lệ"` | 401 |
| E3 | Thiếu signature header (Zalo) | `zalo` | `"Thiếu X-Zalo-Signature header"` | 401 |
| E4 | Payload không phải JSON | `facebook_messenger` | `"Invalid payload"` | 400 |
| E5 | Timestamp quá cũ (Website) | `website` | `"Timestamp quá cũ/mới..."` | 401 |
| E6 | Sai secret_token (Telegram) | `telegram` | `"Telegram secret_token không khớp"` | 401 |

### 5.2 Chi tiết từng test case

**E1 - Channel không hỗ trợ:**

Gửi POST đến `/api/webhook/whatsapp` (hoặc bất kỳ channel nào không trong danh sách 7 channels). Server trả về 400 với thông báo kênh không được hỗ trợ. Test case này xác nhận `channelRegistry.has(channel)` hoạt động đúng.

**E2 - Signature không hợp lệ (Facebook):**

Gửi header `X-Hub-Signature-256: sha256=invalid_signature_here` cùng payload hợp lệ. Server tính HMAC từ rawBody + appSecret trong DB, so sánh timing-safe với signature cung cấp, trả về 401 nếu không khớp.

**E3 - Thiếu signature header (Zalo):**

Gửi payload Zalo hợp lệ nhưng KHÔNG set header `X-Zalo-Signature`. Adapter kiểm tra header existence trước khi verify, trả về 401 kèm thông báo thiếu header.

**E4 - Payload không phải JSON:**

Gửi body là plain text `"this is not json"` cho Facebook Messenger. Sau khi pass signature check, `JSON.parse(rawBody)` sẽ throw error, route handler catch và trả về 400.

**E5 - Timestamp quá cũ (Website):**

Pre-request script tạo timestamp = `now - 600 giây` (10 phút trước). Website adapter kiểm tra `Math.abs(now - timestamp) > 300` (tolerance 5 phút), sẽ trả về 401.

**E6 - Sai secret_token (Telegram):**

Gửi `secret_token: "WRONG_TOKEN"` trong payload Telegram. Adapter so sánh với giá trị trong DB (`webhookSecret` hoặc `verifyToken`), trả về 401 nếu không khớp.

---

## 6. Ghi chú quan trọng - Gap CRM Sync

### 6.1 Vấn đề hiện tại

**Webhook handler hiện tại CHƯA đồng bộ dữ liệu vào CRM.** Sau khi parse webhook payload thành `ParsedWebhookMessage[]`, handler chỉ trả về JSON response mà KHÔNG:

- Tạo hoặc tìm `CustomerIdentity` (xác định khách hàng qua platform + platformUserId)
- Tạo hoặc tìm `Customer` (liên kết với identity)
- Tạo hoặc tìm `Conversation` (theo channel + customerId)
- Tạo `Message` record trong DB
- Trigger automation rules (auto-reply, auto-assign, auto-tag)
- Emit realtime event cho UI cập nhật

### 6.2 Luồng hoàn chỉnh cần triển khai

```
Webhook nhận → Parse thành ParsedWebhookMessage[]
  → CHO TỪNG message:
    1. Tìm CustomerIdentity theo (platform, platformUserId)
       → Nếu không có: tạo Customer mới + CustomerIdentity
    2. Tìm Conversation đang mở (status='open') theo (channel, customerId)
       → Nếu không có: tạo Conversation mới
    3. Tạo Message record (senderType='customer')
    4. Chạy AutomationRule: keyword match → auto_reply / auto_assign / auto_tag
    5. Emit SSE event cho realtime UI update
```

### 6.3 Logic tham khảo từ `/api/simulation`

Logic automation đã tồn tại trong `/api/simulation/route.ts` (action `send_once`). Có thể tái sử dụng:

```typescript
// Từ simulation/route.ts — logic automation reference
const rules = await db.automationRule.findMany({ where: { enabled: true } })
const matched = rules.find(r => content.toLowerCase().includes(r.keyword.toLowerCase()))
if (matched) {
  if (matched.replyMessage) {
    await db.message.create({
      data: { conversationId, senderType: 'bot', senderName: 'Bot',
              messageType: 'text', content: matched.replyMessage }
    })
  }
  if (matched.assignToId) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { ownerId: matched.assignToId }
    })
  }
  if (matched.tagId) {
    await db.conversationTag.create({
      data: { conversationId, tagId: matched.tagId }
    }).catch(() => {})
  }
}
```

### 6.4 Bug đã phát hiện

| Bug | Mô tả | File | Ảnh hưởng |
|---|---|---|---|
| Telegram payload parse | Adapter map `payload.result[]` nhưng Telegram gửi `{ update_id, message }` trực tiếp | `adapters/telegram.ts` | Mọi webhook Telegram sẽ trả `received: 0` |

**Fix cho Telegram adapter:**

```typescript
// Thay vì:
const messages = (payload.result || []).map(...)

// Sửa thành:
const updates = payload.result || (payload.message ? [payload] : [])
const messages = updates.map((update: any) => {
  const msg = update.message
  if (!msg) return null
  // ... rest of mapping
}).filter(Boolean)
```

---

## 7. Appendix: Pre-request Script giải thích

### 7.1 HMAC-SHA256 cho Facebook/Zalo/Chatwork

```javascript
// Tương tự cho FB (X-Hub-Signature-256), Zalo (X-Zalo-Signature), Chatwork (X-ChatWorkWebhookSignature)
const crypto = require('crypto')
const secret = pm.variables.get('fb_app_secret')  // hoặc zalo_app_secret, chatwork_token
const body = pm.request.body.raw
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
pm.request.headers.upsert({ key: 'X-Hub-Signature-256', value: sig })
```

**Giải thích:**
1. Lấy secret từ Postman variable
2. Lấy raw body (CHƯA parse) — điều này quan trọng vì signature tính trên raw string
3. Tạo HMAC-SHA256 digest dưới dạng hex string
4. Facebook yêu cầu prefix `sha256=`, Zalo và Chatwork KHÔNG cần prefix

### 7.2 Timestamp + HMAC cho Website Widget

```javascript
const crypto = require('crypto')
const secret = pm.variables.get('webhook_secret')
const body = pm.request.body.raw
const timestamp = Math.floor(Date.now() / 1000)           // Unix timestamp hiện tại (giây)
const signedPayload = timestamp + '.' + body               // Nối timestamp + body bằng dấu '.'
const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
pm.request.headers.upsert({ key: 'X-Webhook-Timestamp', value: String(timestamp) })
pm.request.headers.upsert({ key: 'X-Webhook-Signature', value: sig })
```

**Giải thích:**
1. Tính timestamp hiện tại (giây) — đảm bảo luôn trong tolerance 300s
2. Nối `{timestamp}.{rawBody}` thành string để ký
3. HMAC-SHA256 trên string đã nối
4. Set cả 2 headers: `X-Webhook-Timestamp` và `X-Webhook-Signature`

### 7.3 Telegram — Không cần pre-request script

Telegram verification so sánh `secret_token` nằm trong body payload, không dùng HMAC.
Chỉ cần đảm bảo giá trị `secret_token` trong JSON body khớp với DB config.

---

## Quick Reference Card

```
┌─────────────────────┬──────────────────────────────┬───────────────────────┐
│ Channel             │ Signature Header            │ Thuật toán            │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ facebook_messenger  │ X-Hub-Signature-256         │ sha256=HMAC(secret,   │
│                     │                              │   rawBody)            │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ facebook_comment    │ X-Hub-Signature-256         │ sha256=HMAC(secret,   │
│                     │                              │   rawBody)            │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ zalo                │ X-Zalo-Signature            │ HMAC(secret, rawBody) │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ telegram            │ (trong body: secret_token)   │ So sánh trực tiếp     │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ chatwork            │ X-ChatWorkWebhookSignature  │ HMAC(token, rawBody)  │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ website             │ X-Webhook-Signature +       │ HMAC(secret,          │
│                     │ X-Webhook-Timestamp         │   ts.rawBody)         │
├─────────────────────┼──────────────────────────────┼───────────────────────┤
│ email               │ (Không có)                  │ Luôn pass             │
└─────────────────────┴──────────────────────────────┴───────────────────────┘
```
