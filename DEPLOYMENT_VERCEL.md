# Hướng dẫn Deploy OmniChat CRM lên Vercel

Vercel là nền tảng Serverless hoàn hảo cho Next.js, tuy nhiên kiến trúc Serverless (không trạng thái, ổ cứng tạm thời) đòi hỏi chúng ta phải cấu hình lại một số thành phần so với việc chạy trên máy chủ ảo (VPS/Ubuntu).

---

## 1. Những thay đổi bắt buộc (Kiến trúc Serverless)

### 1.1. Database (Không dùng SQLite)
Trên Vercel, mọi file ghi vào hệ thống (như `custom.db` của SQLite) sẽ bị xóa ngay khi function kết thúc.
👉 **Giải pháp:** Sử dụng Cloud Database (MySQL/PostgreSQL) như PlanetScale, TiDB, Aiven, hoặc Supabase.
- Thiết lập biến môi trường `DATABASE_PROVIDER=mysql` hoặc `DATABASE_PROVIDER=postgresql`
- Thêm `DATABASE_URL=mysql://user:pass@host:3306/omnichat` hoặc `DATABASE_URL=postgresql://user:pass@host:5432/omnichat`

*Lưu ý:* Cần cài đặt thêm các thư viện tương ứng trước khi push lên repo:
- Nếu dùng MySQL: `bun add @prisma/adapter-mysql mysql2`
- Nếu dùng PostgreSQL: `bun add @prisma/adapter-pg pg`

### 1.2. File Storage (Không dùng Local Driver)
Thư mục `public/uploads` sẽ không được lưu trữ vĩnh viễn trên Vercel.
👉 **Giải pháp:** Chuyển sang sử dụng `S3Driver` (AWS S3, Cloudflare R2, MinIO,...).
- Thiết lập `STORAGE_DRIVER=s3`
- Cấu hình các biến `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, và `AWS_S3_ENDPOINT` (nếu dùng Cloudflare R2 / Custom S3).

### 1.3. Redis (Bắt buộc cho Rate Limit & Cache)
Vercel Edge/Serverless functions cần một in-memory store dùng chung.
👉 **Giải pháp:** Sử dụng [Upstash Redis](https://upstash.com/) (miễn phí) hoặc Redis provider bất kỳ.
- Thiết lập `REDIS_URL=rediss://default:password@host:port`

### 1.4. Realtime / WebSocket (Lưu ý)
Vercel Serverless Functions không hỗ trợ duy trì kết nối WebSocket liên tục như VPS.
👉 **Giải pháp:** OmniChat tự động hỗ trợ fallback sang **SSE (Server-Sent Events)** (Polling interval).
Trên bản miễn phí (Hobby) của Vercel, thời gian chạy tối đa là 10 giây (10s timeout), SSE connection có thể thỉnh thoảng bị ngắt và tự động kết nối lại. (Pro plan cho phép 60s).

---

## 2. Các bước triển khai trên Vercel

### Bước 1: Chuẩn bị Source Code
Đảm bảo bạn đã commit toàn bộ thay đổi lên một Git provider (GitHub, GitLab, hoặc Bitbucket).

**Lưu ý quan trọng trong `package.json`:**
Để Prisma tự động tạo Client khi Vercel build, hãy đảm bảo bạn có đoạn script sau (hoặc cấu hình build command ghi đè trên Vercel):
```json
"scripts": {
  "postinstall": "prisma generate",
  "build": "next build"
}
```

### Bước 2: Import Project
1. Đăng nhập vào [Vercel](https://vercel.com/).
2. Chọn **Add New... > Project**.
3. Chọn Repository chứa OmniChat CRM và nhấn **Import**.

### Bước 3: Cấu hình Build & Framework
Vercel sẽ tự động nhận diện đây là dự án **Next.js**.

- **Framework Preset:** Next.js
- **Root Directory:** `./`
- **Build Command:** Vercel mặc định dùng `npm run build` hoặc `bun run build`. (Nếu bạn không cấu hình `postinstall`, hãy ghi đè thành `bun run db:generate && bun run build`).
- **Install Command:** Vercel tự nhận diện qua `bun.lock`. Nếu cần, ghi đè thành `bun install`.

### Bước 4: Thiết lập Environment Variables
Chuyển sang tab **Environment Variables** và nhập đầy đủ các biến sau:

```ini
# Database
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=sinh_ra_mot_chuoi_ngau_nhien_tai_day
NEXTAUTH_URL=https://your-domain.vercel.app

# Storage
STORAGE_DRIVER=s3
AWS_REGION=auto
AWS_S3_BUCKET=omnichat
AWS_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Redis
REDIS_URL=rediss://...

# Rate Limit & Security
RATE_LIMIT_ENABLED=true
CSRF_ENABLED=true
```

### Bước 5: Build và Deploy
Nhấn nút **Deploy**.
Vercel sẽ tự động tải các dependencies, chạy `prisma generate`, `next build` và publish lên Edge Network.

---

## 3. Khởi tạo Database (Migration)

Sau khi deploy thành công, Database (MySQL) của bạn vẫn đang trống. Bạn không thể chạy `prisma db push` trên môi trường Vercel. Hãy thực hiện từ máy local của bạn:

1. Chỉnh sửa `.env` ở local của bạn để trỏ `DATABASE_URL` về Cloud Database vừa tạo.
2. Chạy lệnh:
```bash
bun run db:push
bun run scripts/seed.ts
```
*(Nếu bạn muốn quản lý file migration thay vì push đè, hãy dùng `bun run db:migrate`)*

Bây giờ bạn đã có thể truy cập vào URL mà Vercel cung cấp (ví dụ `https://omnichat-crm.vercel.app`) và đăng nhập bằng tài khoản admin mặc định.

---

## 4. Tóm tắt Troubleshooting

1. **Lỗi `PrismaClient is unable to be run in the browser` hoặc `Cannot find module '@prisma/client'`**
   - Đảm bảo Vercel đã chạy `prisma generate` trước khi build.

2. **Upload file báo lỗi 500**
   - Kiểm tra lại bạn đã chuyển `STORAGE_DRIVER=s3` chưa. Local driver sẽ gây lỗi do thiếu quyền ghi hoặc thư mục biến mất trên Vercel.

3. **Login redirect về trang localhost**
   - Đảm bảo `NEXTAUTH_URL` được set thành domain chính xác của Vercel cung cấp (VD: `https://your-app.vercel.app`).
