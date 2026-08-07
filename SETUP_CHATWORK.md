# Hướng dẫn cấu hình kênh Chatwork trên Production

Tài liệu này hướng dẫn bạn cách lấy các thông số cần thiết từ Chatwork và thiết lập Webhook để đồng bộ tin nhắn về hệ thống OmniChat CRM một cách tự động (real-time) trên môi trường Production.

---

## 1. Lấy thông tin kết nối từ Chatwork

### 1.1 Lấy API Token
API Token giúp OmniChat có quyền gửi tin nhắn (reply) và lấy thông tin người dùng từ Chatwork.

1. Đăng nhập vào tài khoản [Chatwork](https://www.chatwork.com/) trên trình duyệt máy tính.
2. Bấm vào mũi tên cạnh tên profile ở góc trên bên phải màn hình > Chọn **Service Integration** (Tích hợp dịch vụ).
3. Ở thanh menu bên trái, chọn **API Token**.
4. (Nếu chưa có) Nhập mật khẩu tài khoản của bạn để hệ thống tạo Token.
5. Copy chuỗi **API Token** này để chuẩn bị nhập vào OmniChat CRM.

### 1.2 Lấy Room ID mặc định (Tuỳ chọn)
Để CRM biết sẽ quản lý phòng chat (room) cụ thể nào:
1. Mở một nhóm chat (Room) trên Chatwork mà bạn muốn đồng bộ.
2. Nhìn lên thanh địa chỉ (URL) của trình duyệt, bạn sẽ thấy định dạng: `https://www.chatwork.com/#!rid123456789`
3. Phần số `123456789` sau chữ `rid` chính là **Room ID**. Copy dãy số này.

---

## 2. Cấu hình trên hệ thống OmniChat CRM

1. Đăng nhập vào OmniChat CRM với tài khoản Admin.
2. Mở thanh Sidebar bên trái > Truy cập **Settings** (Cài đặt) > **Channels** (Kênh kết nối).
3. Nhấp chọn kênh **Chatwork**.
4. Nhập các thông tin:
   - **API Token**: Dán mã Token vừa copy ở Bước 1.1.
   - **Room ID mặc định**: Dán ID của Room vừa copy ở Bước 1.2.
5. Nhấp nút **Test Connection** để kiểm tra API Token. Nếu màn hình thông báo *"Kết nối thành công - Tài khoản:..."*, thông tin của bạn đã chính xác.
6. Gạt công tắc trạng thái sang **Active** (Kích hoạt) và bấm **Lưu cấu hình**.

---

## 3. Cấu hình Webhook (Đồng bộ tin nhắn 2 chiều)

Webhook là cơ chế để Chatwork "bắn" tin nhắn mới về cho OmniChat ngay khi khách hàng gửi tin nhắn.

### Bước 3.1: Xác định Webhook URL của CRM
Trên production (đã có tên miền HTTPS), đường dẫn nhận sự kiện Chatwork của bạn sẽ là:
```text
https://<ten-mien-cua-ban.com>/api/webhook/chatwork
```
*(Thay `<ten-mien-cua-ban.com>` bằng domain thực tế mà bạn deploy, VD: `omnichat.vercel.app`)*

### Bước 3.2: Khởi tạo Webhook trên Chatwork
1. Quay lại trang **Service Integration** trên Chatwork.
2. Chuyển sang menu **Webhook** ở thanh điều hướng bên trái.
3. Bấm **Create Webhook** (Tạo Webhook mới).
4. Điền các thông tin cấu hình:
   - **Webhook Name:** Nhập tên bất kỳ để phân biệt (VD: `OmniChat Webhook`).
   - **Webhook URL:** Dán URL đã chuẩn bị ở Bước 3.1.
   - **Event:** Tích chọn `Message created` (Tạo tin nhắn mới) và `Message updated` (Cập nhật tin nhắn).
   - **Room ID:** (Tuỳ chọn) Nếu chỉ muốn đồng bộ tin nhắn từ một room cụ thể, nhập Room ID vào đây. Để trống sẽ bắt tin nhắn của mọi room.
5. Bấm **Create** (Tạo).

> ⚠️ **Lưu ý Kỹ Thuật (Webhook Signature):**
> Sau khi tạo Webhook, Chatwork sẽ cung cấp một **Webhook Token** (base64) để ký xác thực bảo mật HMAC-SHA256. 
> Tại phiên bản hiện tại, adapter Chatwork của OmniChat CRM (`src/lib/channels/adapters/chatwork.ts`) đang mặc định verify Webhook Signature dựa trên trường `API Token`. 
> Nếu trên thực tế môi trường Production của bạn xảy ra tình trạng "Test thành công nhưng webhook không nhận tin nhắn" (lỗi 401/Invalid Signature), vui lòng vô hiệu hoá tạm thời bước verify chữ ký HMAC trong file Adapter Chatwork, hoặc mở rộng database để thêm trường lưu cấu hình riêng biệt cho `Webhook Token`.

---

## 4. Kiểm thử (Testing)

1. Mở ứng dụng Chatwork hoặc nhờ một tài khoản khác gửi tin nhắn vào Room đã cấu hình.
2. Mở giao diện **Dashboard** > **Hội thoại (Conversations)** của OmniChat CRM.
3. Bạn sẽ thấy tin nhắn mới xuất hiện ngay lập tức (Real-time).
4. Thử gõ nội dung phản hồi từ OmniChat CRM và bấm gửi. Quay lại cửa sổ Chatwork để xác nhận tin nhắn phản hồi đã xuất hiện thành công qua API.

Chúc bạn thiết lập và đồng bộ thành công hệ thống chăm sóc khách hàng đa kênh!
