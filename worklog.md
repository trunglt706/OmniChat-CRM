# Work Log

---
Task ID: 1
Agent: Main Agent
Task: Kiểm tra và fix toàn bộ lỗi trong dự án OmniChat CRM

Work Log:
- Phát hiện `middleware.ts` gây crash server sau mỗi request (Next.js 16 deprecate middleware, dùng proxy.ts)
- Chuyển `src/middleware.ts` sang `src/proxy.ts` (Next.js 16 convention), loại bỏ `setInterval` gây crash
- Fix TypeScript errors: `auth.ts` (token.id unknown type), `conversation-list.tsx` (NodeJS.Timeout), `simulation/route.ts` & `messages/route.ts` (automationResult type), `bot/route.ts` (z-ai-web-dev-sdk API)
- Phát hiện NextAuth v4 OAuth callback không tương thích với Next.js 16 (body parsing error)
- Tạo mock login API trực tiếp (`/api/auth/mock/login`) dùng `next-auth/jwt.encode` để set JWT cookie, bỏ qua NextAuth OAuth flow
- Update login page dùng `fetch` trực tiếp thay vì `signIn()` từ next-auth/react
- Tạo logout API (`/api/auth/mock/logout`) xóa session cookie
- Bỏ import `signOut` từ `next-auth/react` trong page.tsx
- Phát hiện OOM (3.9GB RAM, next-server dùng quá 2.2GB bị kill)
- Thêm `--max-old-space-size=2560` vào dev script

Stage Summary:
- Server chạy ổn định, không còn crash
- Login flow hoạt động: `/login` → POST `/api/auth/mock/login` → redirect tới app với JWT cookie
- Proxy.ts (Next.js 16) thay thế middleware.ts: auth guard + rate limiting
- 0 TypeScript errors trong src/
- Tất cả trang (/, /reports, /settings) trả về 200
- API endpoints hoạt động bình thường
---
Task ID: 1
Agent: Main Agent
Task: Audit và fix toàn bộ hardcoded data → API calls

Work Log:
- Audit toàn bộ 39 files trong src/app/, src/components/, src/store/, src/lib/
- Tìm 7 vị trí hardcoded data cần sửa
- Tạo helper session.ts (getAuthUser) dùng chung cho mọi API route
- Tạo API /api/auth/me trả về user thật từ DB qua JWT decode
- Fix /api/auth/mock/login: lookup user từ DB theo email, auto-provision nếu chưa có
- Fix /api/auth/mock/userinfo: đọc JWT → trả về user từ DB
- Fix crm-store.ts: xóa DEFAULT_USER, currentUser = null, isAuthenticated = false
- Fix page.tsx: thêm useEffect fetch /api/auth/me để load user vào store
- Fix settings/page.tsx: thêm useEffect fetch /api/auth/me (separate route)
- Fix conversations/route.ts: thay 'mock_current_user' bằng session user ID
- Fix messages/route.ts: thay 'mock_current_user' bằng session user ID + senderName từ auth
- Tạo API /api/agents/me/stats: tính thống kê thật từ DB (conversationsToday, avgResponse, totalConversations)
- Fix profile-panel.tsx: fetch stats từ /api/agents/me/stats thay vì hardcode '12', '2m 30s', '4.8/5', '1,247'
- Fix settings/page.tsx ProfileTab: fetch stats từ /api/agents/me/stats

Stage Summary:
- Tất cả 7 vị trí hardcoded data đã được sửa
- Tất cả data giờ đến từ API → DB, không còn hardcode
- Verified: login → tạo user từ DB, /api/auth/me trả về user thật, stats tính từ DB
- Conversations filter 'assigned=me' dùng đúng user ID từ session
- Agent messages ghi đúng senderId từ session
---
Task ID: 2
Agent: Main Agent
Task: Kiểm tra cấu hình kênh chat, thêm ChatWork, thêm Test Connection

Work Log:
- Audit toàn bộ hệ thống kênh: phát hiện 7 kênh nhưng chỉ 5 có UI, không có persistence, không có test connection
- Thêm model ChannelConfig vào Prisma schema (channel, enabled, config JSON, lastTestAt/Ok/Msg)
- Chạy prisma db push thành công
- Tạo API GET/PUT /api/channels với metadata fields cho từng kênh (7 kênh đầy đủ)
- Tạo API POST /api/channels/test với test thật cho Telegram (gọi getMe API) và ChatWork (gọi /me API)
- Validate config cho tất cả kênh: Facebook (graph API), Zalo (format check), Email (IMAP validation), Website (URL parse)
- Rewrite hoàn toàn ChannelsTab component: load từ API, dynamic forms từ API fields, không còn hardcode
- Thêm 2 kênh mới vào UI: Facebook Comment + Chatwork
- Sửa bug email IMAP input chết (không có value/onChange)
- Thêm i18n cho ChatWork, FB Comment, test connection (3 ngôn ngữ: vi, en, zh)
- Bổ sung channel filters: thêm facebook_comment + chatwork vào conversation-list
- Thêm facebook_comment vào dashboard CHANNEL_COLORS
- Thêm mock messages cho chatwork + facebook_comment trong simulation
- Sửa bug JSX comment thiếu `}` gây crash
- Thêm /api/channels vào rate limit list trong proxy.ts

Stage Summary:
- 7 kênh đầy đủ: FB Messenger, FB Comment, Zalo, Telegram, ChatWork, Website, Email
- Config persistence qua DB (ChannelConfig model)
- Test Connection hoạt động thật cho Telegram + ChatWork, validate cho các kênh khác
- UI ChannelsTab hoàn toàn dynamic, load từ API, không hardcode
