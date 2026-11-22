/**
 * Fixture: tạo file PDF hợp lệ để dùng trong script kiểm chứng.
 *
 * <p>Khác với PDF "tối giản" chỉ có magic bytes (`%PDF-1.4`), file này có đủ
 * cấu trúc (catalog / pages / page / content stream / font + xref table) để
 * **pdf.js render được** — cần thiết khi kiểm chứng tính năng xem CV trực
 * tiếp trên UI.
 */

/**
 * Tạo PDF 1 trang có chữ, đủ cấu trúc cho pdf.js.
 *
 * @returns Buffer chứa bytes của file PDF
 */
export function makeValidPdf() {
  const content =
    "BT /F1 28 Tf 72 700 Td (Nguyen Van A - CV) Tj ET\n" +
    "BT /F1 14 Tf 72 660 Td (Da Nang University) Tj ET";

  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.7\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
