-- AI moderation layer: lưu câu tóm tắt tiếng Việt của AI cho tin tuyển dụng.
--
-- `ai_summary` lưu riêng vì kết quả kiểm tra nền (tự động) và kết quả kiểm tra
-- thủ công phải có cùng hình dạng — quản trị viên mở dialog xem được cả câu tóm
-- tắt dù tin được kiểm tra nền hay thủ công (spec.md mục 13 và mục 18).
--
-- V15 đã tạo `ai_verdict` / `ai_reasons` / `ai_checked_at`; file này chỉ bổ sung
-- cột còn thiếu.
ALTER TABLE job_posts
    ADD COLUMN ai_summary VARCHAR(500) NULL AFTER ai_reasons;
