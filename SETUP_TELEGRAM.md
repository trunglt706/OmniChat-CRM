# Hướng dẫn cấu hình kênh Telegram trên Production

Tài liệu này hướng dẫn bạn cách khởi tạo Bot Telegram, lấy Token và cấu hình Webhook để đồng bộ tin nhắn tự động từ Telegram về hệ thống OmniChat CRM trên môi trường Production.

---

## 1. Tạo Bot và Lấy Bot Token (Từ Telegram)

Để nhận và gửi tin nhắn, bạn cần tạo một con Bot thông qua ứng dụng Telegram:

1. Mở ứng dụng Telegram, tìm kiếm tài khoản **@BotFather** (có dấu tích xanh) và bấm Start để bắt đầu trò chuyện.
2. Gõ lệnh `/newbot` để tạo một bot mới.
3. BotFather sẽ yêu cầu bạn nhập **Tên hiển thị** cho Bot (Ví dụ: `Cửa Hàng Của Tôi`).
4. Tiếp theo, nhập **Username** cho Bot. (Phải kết thúc bằng chữ `bot` hoặc `_bot`, ví dụ: `my_store_bot`).
5. Nếu thành công, BotFather sẽ gửi cho bạn một tin nhắn chúc mừng kèm theo chuỗi **HTTP API Token** (có dạng `123456789:ABCdefGHI...`).
6. Copy toàn bộ chuỗi **Bot Token** này.

---

## 2. Cấu hình trên hệ thống OmniChat CRM

1. Đăng nhập vào OmniChat CRM với tài khoản Admin.
2. Mở thanh Sidebar bên trái > Truy cập **Settings** (Cài đặt) > **Channels** (Kênh kết nối).
3. Nhấp chọn kênh **Telegram**.
4. Dán **Bot Token** vừa copy ở Bước 1 vào ô tương ứng.
5. (Tuỳ chọn) Ở mục Webhook URL, bạn nhập URL webhook theo định dạng: `https://<ten-mien-cua-ban.com>/api/webhook/telegram` (chỉ dùng để lưu trữ/hiển thị).
6. Bấm nút **Test Connection** để kiểm tra API. Nếu hiện thông báo *"Kết nối thành công - Bot: @..."*, thông tin của bạn đã chính xác.
7. Đổi trạng thái sang **Active** (Kích hoạt) và bấm **Lưu cấu hình**.

---

## 3. Cấu hình Webhook (Bắt buộc cho đồng bộ Real-time)

Telegram khác với các nền tảng khác ở chỗ bạn không cấu hình Webhook qua giao diện cài đặt, mà phải gọi một API đặc biệt của Telegram để báo cho họ biết địa chỉ Webhook của bạn.

### Bước 3.1: Xác định Webhook URL
Webhook URL của bạn sẽ là: `https://<ten-mien-cua-ban.com>/api/webhook/telegram`
*(Bắt buộc phải là HTTPS)*

### Bước 3.2: Đăng ký Webhook với Telegram
Mở trình duyệt web của bạn, dán đường link sau vào thanh địa chỉ (thay thế bằng thông tin thật của bạn) và nhấn Enter:

```text
https://api.telegram.org/bot<BOT_TOKEN_CUA_BAN>/setWebhook?url=https://<ten-mien-cua-ban.com>/api/webhook/telegram&secret_token=123456
```
- Thay `<BOT_TOKEN_CUA_BAN>` bằng Bot Token lấy từ BotFather.
- Thay URL bằng đường dẫn webhook thực tế của bạn.
- Chuỗi `secret_token` là một mã bảo mật bạn tự đặt (VD: `123456`).

Nếu thành công, trình duyệt sẽ hiển thị: `{"ok":true,"result":true,"description":"Webhook was set"}`.

> ⚠️ **LƯU Ý KỸ THUẬT RẤT QUAN TRỌNG:**
> Hiện tại, Adapter Telegram của OmniChat CRM (`src/lib/channels/adapters/telegram.ts`) đang có tính năng kiểm tra Webhook Signature thông qua trường `config.verifyToken` hoặc `config.webhookSecret`. Tuy nhiên, các trường này **hiện chưa có trên giao diện UI (Kênh kết nối)** để người quản trị có thể điền mã `secret_token`.
> 
> **Cách khắc phục để Webhook nhận được tin nhắn trên Production:**
> - **Cách 1 (Dành cho Developer):** Mở file `src/lib/channels/adapters/telegram.ts`, cập nhật thêm field `verifyToken` vào mảng `fields` của biến `meta` để có thể nhập mã xác thực từ giao diện người dùng. Đồng thời sửa lại logic đọc `secret_token` từ header `X-Telegram-Bot-Api-Secret-Token` (do Telegram không gửi mã này trong body payload).
> - **Cách 2 (Sửa DB):** Can thiệp trực tiếp vào database (bảng lưu trữ cấu hình Channel) và thêm khoá `verifyToken: "123456"` vào cột JSON config của channel Telegram.
> - **Cách 3 (Tạm thời):** Sửa code hàm `verifyWebhook()` của Adapter Telegram để luôn trả về `return { valid: true, message: 'OK' }` nếu không muốn xác thực bảo mật ở giai đoạn này.

---

## 4. Kiểm thử (Testing)

1. Mở ứng dụng Telegram, tìm kiếm Username của Bot (từ bước 1).
2. Bấm **Start** và gửi một tin nhắn bất kỳ (Ví dụ: "Xin chào").
3. Mở giao diện **Dashboard** > **Hội thoại (Conversations)** của OmniChat CRM.
4. Tin nhắn mới sẽ xuất hiện ngay lập tức (Real-time).
5. Gõ câu trả lời trực tiếp trên OmniChat CRM. Khách hàng sẽ lập tức nhận được phản hồi trên Telegram thông qua API.
