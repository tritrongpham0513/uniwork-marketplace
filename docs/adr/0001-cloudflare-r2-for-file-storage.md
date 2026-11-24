# Cloudflare R2 cho lưu trữ tệp

Lựa chọn Cloudflare R2 (S3-compatible object storage) thay vì lưu tệp trong container hoặc filesystem để có được:

1. **Khả năng mở rộng**: tệp không còn ràng buộc với capacity của container; sinh viên upload nhiều CV, nhà tuyển dụng upload logo mà không làm đầy đĩa.
2. **Sự bền vững**: tệp vẫn tồn tại khi container redeploy (Vercel/Render không đảm bảo tệp lưu lại).
3. **Tốc độ**: R2 phân phối qua Cloudflare CDN, tải xuống nhanh hơn từ server.

Giá trị: chi phí R2 khá rẻ so với AWS S3 (R2 miễn phí 10M requests/tháng + storage rẻ hơn 80%).

**Triển khai**: Backend sử dụng `R2StorageProvider` với Cloudflare API; Frontend nhận presigned URL để tải xuống trực tiếp. Mọi tệp upload qua API (POST `/api/v1/files/upload`) được xác minh magic bytes trước khi lưu.
