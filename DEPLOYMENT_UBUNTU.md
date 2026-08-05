# Hướng Dẫn Deploy OmniChat CRM lên VPS Ubuntu

Tài liệu này hướng dẫn chi tiết từng bước để triển khai ứng dụng **OmniChat CRM** lên máy chủ VPS chạy hệ điều hành **Ubuntu (20.04 / 22.04 / 24.04 LTS)**.

---

## 1. Tổng Quan Kiến Trúc Ứng Dụng

Ứng dụng bao gồm các dịch vụ chính cần khởi chạy:
1. **Next.js Web Server (CRM App)**: Chạy trên cổng `3000` (ở chế độ Standalone).
2. **WebSocket Chat Service (`mini-services/chat-service`)**: Chạy trên cổng `3003` xử lý giao tiếp thời gian thực.
3. **Database**: SQLite (mặc định trong file `db/custom.db`) hoặc MySQL/MariaDB.
4. **Reverse Proxy**: Nginx hoặc Caddy điều hướng tên miền/IP và cấu hình SSL (HTTPS/WSS).

---

## 2. Yêu Cầu Hệ Thống (Prerequisites)

- **Cấu hình phần cứng tối thiểu**: 1 Core CPU, 2GB RAM, 10GB SSD.
- **Hệ điều hành**: Ubuntu 20.04 / 22.04 / 24.04 LTS.
- **Tên miền (Domain)**: Đã trỏ A record về IP VPS (Ví dụ: `crm.yourdomain.com`).

---

## 3. Các Bước Triển Khai Chi Tiết

### Bước 1: Cập Nhật VPS & Cài Đặt Môi Trường Ban Đầu

Truy cập VPS qua SSH và cập nhật hệ thống:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential ufw
```

#### Cài đặt Node.js (Phiên bản LTS v20 hoặc v22) & PM2:

```bash
# Cài đặt Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Kiểm tra phiên bản Node.js và npm
node -v
npm -v

# Cài đặt PM2 (Quản lý tiến trình chạy ẩn)
sudo npm install -g pm2
```

#### (Tùy chọn) Cài đặt Bun Runtime (Tốc độ cao):

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun -v
```

---

### Bước 2: Clone Source Code & Cài Đặt Dependencies

Chuyển vào thư mục chứa dự án (ví dụ `/var/www` hoặc `/home/ubuntu`):

```bash
cd /var/www
sudo git clone <URL_GIT_REPOSITORY_CỦA_BẠN> omnichat-crm
cd omnichat-crm

# Cấp quyền thư mục nếu cần
sudo chown -R $USER:$USER /var/www/omnichat-crm
```

Cài đặt các gói phụ thuộc (Dependencies) cho dự án chính và mini-service:

```bash
# Cài đặt dự án chính (Dùng npm/bun)
npm install
# Hoặc nếu dùng Bun: bun install

# Cài đặt cho Chat Service (trong mini-services/chat-service)
cd mini-services/chat-service
npm install
# Hoặc: bun install
cd ../..
```

---

### Bước 3: Cấu Hình Biến Môi Trường (`.env`)

Tạo file `.env` từ file mẫu hoặc cấu hình trực tiếp:

```bash
cp .env.example .env
nano .env
```

Nội dung `.env` sản xuất mẫu:

```env
# ─── Database Configuration ───────────────────────────────────────
# Sử dụng SQLite
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./db/custom.db"

# Hoặc nếu sử dụng MySQL (Bỏ comment nếu dùng MySQL):
# DATABASE_PROVIDER=mysql
# DATABASE_URL="mysql://omnichat_user:password_baomat@localhost:3306/omnichat"

# ─── Authentication ────────────────────────────────────────────────
# Tạo chuỗi secret ngẫu nhiên: openssl rand -base64 32
NEXTAUTH_SECRET=your_random_secure_secret_key_here
NEXTAUTH_URL=https://crm.yourdomain.com
SESSION_MAX_AGE=2592000

# ─── Redis (Tùy chọn) ─────────────────────────────────────────────
# REDIS_URL=redis://localhost:6379

# ─── Security Settings ────────────────────────────────────────────
CSRF_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
BUSINESS_RATE_LIMIT_ENABLED=true

# ─── Webhook ──────────────────────────────────────────────────────
WEBHOOK_SECRET=your_webhook_secret_key
```

---

### Bước 4: Khởi Tạo Database & Dữ Liệu Mẫu (Seed)

Khởi tạo cơ sở dữ liệu với Prisma:

```bash
# Đảm bảo thư mục db tồn tại
mkdir -p db

# Đẩy Schema vào Database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Tùy chọn) Chạy script khởi tạo dữ liệu ban đầu
npx tsx scripts/seed.ts
# Hoặc nếu dùng bun: bun run scripts/seed.ts
```

---

### Bước 5: Build Ứng Dụng Next.js Standalone

Tiến hành build ứng dụng sản xuất:

```bash
npm run build
```

*(Script `npm run build` sẽ chạy `next build` và tự động thực thi `node scripts/copy-standalone.mjs` để copy static assets vào thư mục `.next/standalone`)*.

---

### Bước 6: Khởi Chạy Dịch Vụ Với PM2

Tạo file cấu hình PM2 `ecosystem.config.js` ở thư mục gốc của dự án:

```bash
nano ecosystem.config.js
```

Thêm nội dung cấu hình sau:

```javascript
module.exports = {
  apps: [
    {
      name: "omnichat-next",
      script: ".next/standalone/server.js",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1"
      }
    },
    {
      name: "omnichat-chat-service",
      script: "index.ts",
      cwd: "./mini-services/chat-service",
      interpreter: "bun", // Hoặc "node" / "npx" (nếu dùng tsx)
      interpreter_args: "run", // Bỏ dòng này nếu dùng node
      env: {
        NODE_ENV: "production",
        PORT: 3003
      }
    }
  ]
};
```

> **Ghi chú**: Nếu VPS không cài `bun`, bạn có thể chạy `chat-service` qua Node:
> `script: "node_modules/.bin/tsx", args: "index.ts"` trong thư mục `mini-services/chat-service`.

Chạy dự án với PM2:

```bash
# Khởi chạy các ứng dụng
pm2 start ecosystem.config.js

# Lưu trạng thái PM2 để tự khởi động khi reboot máy chủ
pm2 save
pm2 startup
```

Kiểm tra trạng thái PM2:

```bash
pm2 status
pm2 logs
```

---

### Bước 7: Cấu Hình Reverse Proxy & SSL (HTTPS/WSS)

Bạn có thể chọn **Nginx** hoặc **Caddy**.

#### Phương Án A: Sử dụng Nginx + Certbot (Khuyên dùng)

1. Cài đặt Nginx & Certbot:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

2. Tạo cấu hình Nginx site:
```bash
sudo nano /etc/nginx/sites-available/omnichat
```

3. Thêm cấu hình reverse proxy cho cả Web App (port 3000) và WebSockets (port 3003):

```nginx
server {
    server_name crm.yourdomain.com;

    # Giao diện CRM (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Kết nối WebSocket Chat Service (Socket.IO)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. Kích hoạt cấu hình và kiểm tra Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/omnichat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. Cài đặt SSL miễn phí với Let's Encrypt:
```bash
sudo certbot --nginx -d crm.yourdomain.com
```

---

#### Phương Án B: Sử dụng Caddy (Tự động cấp SSL)

Nếu muốn dùng Caddy (trong dự án đã có sẵn mẫu `Caddyfile`):

1. Cài đặt Caddy trên Ubuntu:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

2. Sửa `Caddyfile` trong dự án hoặc `/etc/caddy/Caddyfile`:

```caddy
crm.yourdomain.com {
    reverse_proxy /socket.io/* localhost:3003
    reverse_proxy localhost:3000
}
```

3. Restart Caddy:
```bash
sudo systemctl restart caddy
```

---

### Bước 8: Cấu Hình Firewall (UFW)

Bảo mật máy chủ bằng cách chỉ mở các cổng cần thiết (HTTP, HTTPS, SSH):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full' # Hoặc 'Caddy'
sudo ufw enable
sudo ufw status
```

---

## 4. Quy Trình Cập Nhật Ứng Dụng (Deployment Update Script)

Khi có code mới từ Git repository, tạo file script `update.sh` để nâng cấp tự động:

```bash
nano update.sh
```

Nội dung `update.sh`:

```bash
#!/bin/bash
echo "🚀 Đang cập nhật OmniChat CRM..."

# 1. Kéo code mới
git pull origin main

# 2. Cài đặt dependencies
npm install

# 3. Migrate database
npx prisma db push
npx prisma generate

# 4. Build dự án
npm run build

# 5. Reload PM2 không downtime
pm2 reload ecosystem.config.js

echo "✅ Cập nhật hoàn tất thành công!"
```

Cấp quyền thực thi:
```bash
chmod +x update.sh
```

---

## 5. Xử Lý Lỗi Thường Gặp (Troubleshooting)

| Sự cố | Nguyên nhân | Cách khắc phục |
|---|---|---|
| **Lỗi 502 Bad Gateway** | Next.js server (port 3000) chưa khởi chạy hoặc bị crash. | Kiểm tra log với `pm2 logs omnichat-next`. |
| **Không kết nối được WebSocket** | Cổng 3003 chưa chạy hoặc chưa proxied `/socket.io/` trong Nginx/Caddy. | Kiểm tra `pm2 status` và file cấu hình Reverse Proxy. |
| **Lỗi Prisma Database locked / SQLite Permission** | SQLite file không có quyền ghi đối với user chạy PM2. | Chạy `chmod 775 db db/custom.db`. |
| **Hết bộ nhớ (Out of Memory) khi build** | VPS 1GB RAM bị thiếu RAM khi chạy `next build`. | Thêm Swap memory cho Ubuntu: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`. |

---
