# Ngôn ngữ domain + Architecture decisions

## Trước khi viết spec hoặc code

**Hãy đọc**:
1. `GLOSSARY.md` — ngôn ngữ chung của dự án. Khi viết spec, giới thiệu tính năng, hoặc hỏi agent — dùng đúng các từ ở đây.
2. `docs/adr/` — quyết định kiến trúc tại sao dự án làm như vậy. Giúp hiểu ràng buộc và tránh "nên sử dụng X thay vì Y" khi X/Y đã từng được xem xét.

## Khi nào cần đọc lại?

- **Viết spec**: mô tả tính năng mới. Dùng từ GLOSSARY để spec không mơ hồ.
- **Duyệt PR/code**: kiểm tra có dùng đúng từ không, có vi phạm ADR không.
- **Hỏi agent**: "cần implement lệnh tính toán xếp hạng lương" — bắt agent phải đọc `GLOSSARY.md` để hiểu "xếp hạng lương" là gì, rồi đọc `docs/adr/` để không phá quyết định cũ.

## Vị trí

- **GLOSSARY.md**: gốc repo
- **docs/adr/**: 4 file, mỗi file là quyết định lớn
- **Bản thân file này** (`docs/agents/domain.md`): navigation pointer
