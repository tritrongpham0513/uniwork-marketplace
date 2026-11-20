-- ---------------------------------------------------------------------
-- V6 — PHẢN HỒI 2 CHIỀU CHO ĐÁNH GIÁ
--
-- Trước đây bảng `reviews` chỉ có 1 cột `reply` — chỉ người BỊ đánh giá
-- (reviewee) được phản hồi lại. Hệ quả:
--   - SV đánh giá NTD  -> NTD (reviewee) phản hồi được.  ✔
--   - NTD đánh giá SV  -> SV (reviewee) bị chặn, NTD (reviewer) cũng không
--     được phản hồi vì không phải reviewee.  ✘  (mất đối xứng)
--
-- Sửa: tách thành 2 cột để mỗi bên đều có 1 ô phản hồi riêng:
--   - `reply`         -> phản hồi của NGƯỜI BỊ ĐÁNH GIÁ (reviewee)
--   - `reviewer_reply`-> phản hồi của NGƯỜI VIẾT ĐÁNH GIÁ (reviewer)
--
-- `reply` giữ nguyên tên & ý nghĩa cũ để không phá vỡ dữ liệu seed và code
-- cũ đang đọc (`Review.reply`). Dữ liệu `reply` hiện có đều là phản hồi của
-- reviewee -> giữ nguyên, chỉ bổ sung cột mới.
-- ---------------------------------------------------------------------

ALTER TABLE reviews
    ADD COLUMN reviewer_reply VARCHAR(1000) NULL AFTER reply;
