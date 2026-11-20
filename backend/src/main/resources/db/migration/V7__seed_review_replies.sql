-- ---------------------------------------------------------------------
-- V7 — PHẢN HỒI 2 CHIỒU CHO DỮ LIỆU SEED
--
-- V6 thêm cột `reviewer_reply` (phản hồi của người viết đánh giá), nên V3
-- — vốn chạy trước — không thể INSERT cột đó. File này bổ sung giá trị
-- cho các review seed có phản hồi 2 chiều.
--
-- File được sinh tự động bởi `pnpm seed:sql` — không sửa tay.
-- ---------------------------------------------------------------------

UPDATE reviews SET reviewer_reply = 'Hà làm việc rất chuyên nghiệp, chúng tôi rất mong được hợp tác lâu dài.' WHERE slug = 'rev-006';
