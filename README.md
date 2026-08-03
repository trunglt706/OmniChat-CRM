# OmniChat CRM — Omnichannel Customer Management Platform

> Next.js 16 + TypeScript + Prisma + shadcn/ui — Full-featured CRM với 7 kênh chat, AI bot, và kiến trúc Adapter Pattern.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui (45 components) |
| ORM | Prisma 6 (SQLite / MySQL) |
| State | Zustand 5 + TanStack React Query 5 |
| Form | React Hook Form 7 + Zod 4 |
| Auth | NextAuth 4 (JWT) |
| i18n | next-intl 4 (vi / en / zh) |
| Cache | Redis (ioredis) với in-memory fallback |
| Charts | Recharts 2 |
| Animation | Framer Motion 12 |
| Runtime | Bun |

## Features

### Omnichannel (7 kênh)

Mỗi kênh triển khai `IChannelAdapter` interface — thêm kênh mới chỉ cần 1 file adapter.

| # | Kênh | Test Connection | Webhook Verify |
|---|------|:-:|:-:|
| 1 | Facebook Messenger | graph.facebook.com API | HMAC-SHA256 (X-Hub-Signature-256) |
| 2 | Facebook Comment | kế thừa Messenger | HMAC-SHA256 |
| 3 | Zalo OA | openapi.zalo.me API | HMAC-SHA256 (X-Zalo-Signature) |
| 4 | Telegram | api.telegram.org API | secret_token |
| 5 | Chatwork | api.chatwork.com API | HMAC-SHA256 |
| 6 | Website Widget | URL validation | Timestamp + HMAC |
| 7 | Email (IMAP/SMTP) | Host/Port validation | Pass-through |

### Channel Adapter Architecture

```
IChannelAdapter (interface)
  └── BaseChannelAdapter (abstract — shared helpers)
        ├── FacebookMessengerAdapter
        ├── FacebookCommentAdapter (extends Messenger)
        ├── ZaloAdapter
        ├── TelegramAdapter
        ├── ChatworkAdapter
        ├── WebsiteAdapter
        └── EmailAdapter

channelRegistry (singleton) — register / get / test / verify / handle
```

Thêm kênh mới: tạo 1 file trong `src/lib/channels/adapters/` + đăng ký vào `registry.ts`.

### CRM Core

- Dashboard realtime với thống kê theo kênh, trạng thái, ưu tiên
- Quản lý hội thoại (conversation) đa kênh trong 1 giao diện
- Customer 360: thông tin khách hàng + đa nền tảng (identities)
- Internal notes, tags, SLA tracking
- Lead management (pipeline: new → won/lost)
- AI Bot reply (z-ai-web-dev-sdk)
- Automation rules (keyword → reply / assign / tag)

### Security

- CSP (Content Security Policy) headers
- CSRF double-submit cookie protection
- Rate limiting: IP + User + Tenant (Redis sliding window)
- Business rate limit (messages/conversation/hour, bot requests/min)
- Idempotency key cho POST/PUT (tránh duplicate)
- Webhook signature verification (HMAC-SHA256)
- Upload validation (MIME + Magic Bytes)
- XSS output encoding
- WebSocket private channel auth
- IP/email blacklist

### Database

Hỗ trợ chuyển đổi SQLite ↔ MySQL qua env:

```bash
# SQLite (mặc định, zero-config)
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./db/custom.db

# MySQL (production)
DATABASE_PROVIDER=mysql
DATABASE_URL=mysql://root:password@localhost:3306/omnichat
# bun add @prisma/adapter-mysql mysql2
```

13 Prisma models: Organization, User, Customer, CustomerIdentity, Conversation, Message, Tag, ConversationTag, InternalNote, Lead, AutomationRule, AuditLog, ChannelConfig.

## Project Structure

```
src/
├── app/
│   ├── api/                    # 31 API routes
│   │   ├── auth/               # NextAuth + mock login
│   │   ├── channels/           # Channel config + test connection
│   │   ├── conversations/      # CRUD + messages + notes + tags
│   │   ├── customers/          # Customer management
│   │   ├── agents/             # Agent stats
│   │   ├── webhook/[channel]/  # Universal webhook receiver
│   │   ├── bot/                # AI bot reply
│   │   ├── dashboard/          # Dashboard stats
│   │   ├── reports/            # Report data
│   │   ├── automation/rules/   # Automation rules CRUD
│   │   ├── backup/             # Backup & restore
│   │   └── security/           # Blacklist + security config
│   ├── login/page.tsx
│   ├── settings/page.tsx
│   ├── reports/page.tsx
│   └── page.tsx                # Main CRM dashboard
├── components/
│   ├── crm/                    # 8 CRM components
│   ├── ui/                     # 45 shadcn/ui components
│   └── i18n/
├── lib/
│   ├── channels/               # Channel Adapter System
│   │   ├── types.ts            # IChannelAdapter interface
│   │   ├── registry.ts         # Singleton registry
│   │   ├── index.ts            # Barrel export
│   │   └── adapters/           # 7 channel adapters
│   ├── db.ts                   # Prisma client (SQLite/MySQL)
│   ├── db-env.ts               # Database config from env
│   ├── redis.ts                # Redis client + SecurityEnv
│   ├── session.ts              # getAuthUser() helper
│   ├── csrf.ts                 # CSRF protection
│   ├── rate-limit.ts           # Multi-dim rate limiter
│   ├── idempotency.ts          # Idempotency keys
│   ├── webhook-verify.ts       # HMAC-SHA256 verification
│   ├── upload-guard.ts         # File upload validation
│   ├── security-headers.ts     # CSP + security headers
│   ├── ws-auth.ts              # WebSocket auth
│   ├── api-client.ts           # Client fetch (CSRF + idempotency)
│   └── types.ts                # TypeScript interfaces
├── store/
│   └── crm-store.ts            # Zustand global state
├── hooks/
├── i18n/
│   ├── translations.ts
│   └── useT.ts
├── proxy.ts                    # Next.js 16 proxy (auth + rate limit + CSRF)
└── prisma/
    └── schema.prisma           # 13 models
```

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Setup database
bun run db:push

# 3. Seed demo data
bun run scripts/seed.ts

# 4. Start dev server
bun run dev

# 5. Open http://localhost:3000
# Login: admin@omnichat.vn (auto-provision)
```

## Scripts

```bash
bun run dev          # Dev server (port 3000)
bun run build        # Production build (standalone)
bun run start        # Start production server
bun run db:push      # Sync Prisma schema to DB
bun run db:generate  # Generate Prisma client
bun run db:migrate   # Run migrations (dev)
bun run db:reset     # Reset database
```

## Configuration

Copy `.env.example` to `.env` và chỉnh sửa:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PROVIDER` | `sqlite` | `sqlite` hoặc `mysql` |
| `DATABASE_URL` | `file:./db/custom.db` | Connection URL |
| `REDIS_URL` | _(empty)_ | Redis URL, fallback in-memory nếu trống |
| `NEXTAUTH_SECRET` | - | JWT secret (bắt buộc production) |
| `RATE_LIMIT_PER_MINUTE` | `60` | API requests/phút/IP |
| `CSRF_ENABLED` | `true` | Bật/tắt CSRF protection |
| `UPLOAD_MAX_SIZE` | `10485760` | Max upload bytes (10MB) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/mock/login` | Login (auto-provision) |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/channels` | List 7 channels + config |
| PUT | `/api/channels` | Upsert channel config |
| POST | `/api/channels/test` | Test channel connection |
| GET | `/api/conversations` | List conversations (filter by channel/status) |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/[id]/messages` | Get messages |
| POST | `/api/conversations/[id]/messages` | Send message |
| GET/PUT/DELETE | `/api/customers/[id]` | Customer CRUD |
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/reports` | Report data |
| POST | `/api/bot` | AI bot reply |
| POST | `/api/webhook/[channel]` | Webhook receiver |
| GET/POST | `/api/automation/rules` | Automation rules CRUD |
| GET | `/api/backup` | Create backup |
| POST | `/api/backup/restore` | Restore backup |

## License

Private



    // "dev": "NODE_OPTIONS='--max-old-space-size=2560' next dev -p 3000 2>&1 | tee dev.log",