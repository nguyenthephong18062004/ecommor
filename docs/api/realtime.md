# Socket.IO và tài nguyên upload

## Kết nối

Socket.IO gắn cùng HTTP server backend, path mặc định **`/socket.io`**; Vite có proxy WebSocket cho path này. Đây không phải một raw WebSocket protocol tự định nghĩa.

Client sử dụng cookie phiên của cùng host:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', { withCredentials: true });

socket.on('newMessage', message => {
  // Admin cập nhật tin nhắn đến. Không coi event là thay thế kiểm tra quyền HTTP.
});
socket.on('newMessageUser', message => {
  // Khách nhận phản hồi từ admin.
});
```

Đoạn trên là ví dụ dùng package đã có trong client, không yêu cầu cài dependency khác. Không gắn userId query/header để thay cho cookie.

Server đọc cookie `token`, verify token rồi ánh xạ `userId → socket.id` trong Map. Token sai bị disconnect; thiếu cookie có thể vẫn có transport connection nhưng không được đăng ký như user nhận tin cá nhân. Sau verify, server cập nhật isOnline/lastLoginAt; disconnect cập nhật offline nếu đó là socket hiện đang được Map giữ.

Map hiện chỉ giữ một socket cuối cho mỗi user, không phải room nhiều thiết bị/tab. Không có cam kết replay/ack/offline queue qua socket; tin được lưu DB và phải gọi HTTP để đọc lại.

Nguồn: `server/src/socket.js:12`, `:23`, `:40`; `client/vite.config.js:38`.

## Sự kiện đang có

| Hướng | Event | Payload | Hành vi |
| --- | --- | --- | --- |
| Server → admin nhận | `newMessage` | ChatMessage vừa lưu | Phát sau khách gửi HTTP `/api/message/create`, nếu admin nhận đang online |
| Server → khách nhận | `newMessageUser` | ChatMessage vừa lưu | Phát sau admin gửi HTTP `/api/message/create-admin`, nếu khách đang online |
| Client → server | `userConnected` | userId do client truyền | Hiện chỉ log; không tạo danh tính/quyền, không đổi ánh xạ đã xác minh |
| Transport | `connect`, `disconnect` | Theo Socket.IO | Không có API custom subscribe/unsubscribe hoặc ACK gửi tin |

ChatMessage minh họa:

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "senderId": "507f1f77bcf86cd799439012",
  "receiverId": "507f1f77bcf86cd799439013",
  "conversationId": "507f1f77bcf86cd799439012_507f1f77bcf86cd799439013",
  "text": "Tin nhắn fixture",
  "isRead": false,
  "createdAt": "2026-11-02T03:00:00.000Z"
}
```

`conversationId` do server sắp xếp hai ID và nối `_`. Gửi tin vẫn là POST HTTP; không có event `sendMessage` được backend xử lý. Với mất kết nối, đọc lại lịch sử qua HTTP, không tự gửi lại POST liên tục vì chưa có idempotency key tin nhắn.

Nguồn: `server/src/controllers/message.controller.js:11`, `:16`, `:44`; `server/src/models/message.model.js:5`.

## Đọc ảnh đã upload

HTTP GET tài nguyên **`/uploads/<đường-dẫn-file>`** được static server phục vụ. Ví dụ `/uploads/products/<tên-file>` hoặc `/uploads/blogs/<tên-file>`. Không cần token để đọc ảnh công khai. Không có API liệt kê thư mục hoặc API xóa file riêng trong bộ routes.

Upload ảnh sản phẩm trả `images` là mảng URL path; khi tạo/cập nhật sản phẩm phải nối thành string bằng dấu phẩy. Upload blog trả path string trong `metadata`, dùng làm `image` cho bài viết.

Không gửi base64 vào Product.images, không gửi path filesystem như `D:\...` để client đọc. File input trong Postman phải chọn lại từ máy; tài liệu không kèm ảnh khách hoặc đường dẫn upload thật. Xem [limitations](limitations.md) về quyền và validation upload hiện tại.

Nguồn: `server/src/server.js:47`; `server/src/routes/index.js:109`; `server/src/controllers/blog.controller.js:8`.
