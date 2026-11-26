-- AI moderation layer: lưu kết quả kiểm duyệt nội dung tin tuyển dụng.
--
-- `ai_verdict` NULL = CHƯA KIỂM TRA (chưa chạy hoặc chạy lỗi).
-- Phải phân biệt được với kết quả 'OK' — vì vậy không dùng giá trị mặc định.
-- `ai_reasons` lưu JSON array các lý do (code / evidence / detail).
ALTER TABLE job_posts
    ADD COLUMN ai_verdict VARCHAR(10) NULL AFTER reject_reason,
    ADD COLUMN ai_reasons JSON NULL AFTER ai_verdict,
    ADD COLUMN ai_checked_at DATETIME(6) NULL AFTER ai_reasons;

-- Ràng buộc cứng: verdict chỉ có 3 giá trị hợp lệ.
ALTER TABLE job_posts
    ADD CONSTRAINT ck_job_ai_verdict
        CHECK (ai_verdict IS NULL OR ai_verdict IN ('OK', 'WARN', 'SUSPECT'));
