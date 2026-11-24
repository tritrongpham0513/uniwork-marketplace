# Access token + Refresh token trong localStorage

Backend cấp hai loại token khi đăng nhập thành công:

- **Access token**: JWT ngắn hạn (15 phút). Gắn vào header `Authorization: Bearer <token>` cho mỗi request.
- **Refresh token**: JWT dài hạn (7 ngày). Lưu riêng; khi access token hết hạn, client gửi refresh token để lấy access token mới (`POST /api/v1/auth/refresh`).

**Triển khai**: Cả hai token lưu ở `localStorage` phía client. Frontend axios interceptor tự động bắt `401` → gọi `/api/v1/auth/refresh` → lưu access token mới → retry request gốc.

**Lý do chọn**:
1. Stateless: server không cần lưu session, dễ scale.
2. Tự động refresh: trải nghiệm seamless, user không cảm nhận khi token hết hạn.
3. Dự phòng cross-origin: refresh token cần gửi vào body, không thể dùng cookie `SameSite` với cross-site requests.

**Rủi ro**: localStorage dễ bị XSS — mã JavaScript độc hại có thể steal token. Giảm thiểu bằng CSP headers, không dùng `eval()`, và sanitize mọi input từ user.

**Không phải quyết định lại**: Cơ chế này đã triển khai trong backend (`JwtService`) và frontend (`app/src/lib/axios.ts`).
