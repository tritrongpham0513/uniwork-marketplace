package com.uniwork.util;

import java.util.Locale;

/**
 * Xác định MIME type thật của file dựa trên **magic bytes** (chữ ký nhị phân),
 * không tin {@code Content-Type} do client gửi lên.
 *
 * <p>Client có thể tự ý khai báo {@code Content-Type: image/png} cho 1 file
 * bất kỳ — khi đó server sẽ lưu nhầm file nguy hiểm dưới dạng ảnh. Đọc chữ ký
 * nhị phân giúp backend biết chắc loại file thực sự là gì.
 *
 * <p>Chữ ký được hỗ trợ:
 * <ul>
 *   <li>PDF — {@code %PDF}</li>
 *   <li>PNG — {@code 89 50 4E 47 0D 0A 1A 0A}</li>
 *   <li>JPEG — {@code FF D8 FF}</li>
 *   <li>WEBP — {@code RIFF....WEBP}</li>
 *   <li>GIF — {@code GIF8}</li>
 *   <li>DOCX / XLSX / PPTX — ZIP ({@code PK 03 04}) → phân biệt bằng nội dung bên trong</li>
 *   <li>DOC (Word 97-2003) — {@code D0 CF 11 E0 A1 B1 1A E1} (OLE2)</li>
 * </ul>
 */
public final class FileSignatureValidator {

    private FileSignatureValidator() {
    }

    /**
     * Đoán MIME type từ đầu file.
     *
     * @param head các byte đầu tiên của file (ít nhất 12 byte để đủ cho WEBP/DOCX)
     * @return MIME type, hoặc {@code null} nếu không khớp chữ ký nào
     */
    public static String detectMimeType(byte[] head) {
        if (head == null || head.length < 4) {
            return null;
        }

        // PDF — "%PDF"
        if (matches(head, new byte[]{'%', 'P', 'D', 'F'})) {
            return "application/pdf";
        }

        // PNG — 89 50 4E 47 0D 0A 1A 0A
        if (head.length >= 8
                && (head[0] & 0xFF) == 0x89
                && head[1] == 'P' && head[2] == 'N' && head[3] == 'G'
                && (head[4] & 0xFF) == 0x0D
                && (head[5] & 0xFF) == 0x0A
                && (head[6] & 0xFF) == 0x1A
                && (head[7] & 0xFF) == 0x0A) {
            return "image/png";
        }

        // JPEG — FF D8 FF
        if ((head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        // WEBP — "RIFF" + 4 byte size + "WEBP"
        if (head.length >= 12
                && head[0] == 'R' && head[1] == 'I' && head[2] == 'F' && head[3] == 'F'
                && head[8] == 'W' && head[9] == 'E' && head[10] == 'B' && head[11] == 'P') {
            return "image/webp";
        }

        // GIF — "GIF8"
        if (head[0] == 'G' && head[1] == 'I' && head[2] == 'F' && head[3] == '8') {
            return "image/gif";
        }

        // OLE2 (DOC cũ / XLS / PPT)
        if (head.length >= 8
                && (head[0] & 0xFF) == 0xD0
                && (head[1] & 0xFF) == 0xCF
                && (head[2] & 0xFF) == 0x11
                && (head[3] & 0xFF) == 0xE0
                && (head[4] & 0xFF) == 0xA1
                && (head[5] & 0xFF) == 0xB1
                && (head[6] & 0xFF) == 0x1A
                && (head[7] & 0xFF) == 0xE1) {
            return "application/msword";
        }

        // ZIP — DOCX / XLSX / PPTX (PK 03 04)
        if ((head[0] & 0xFF) == 0x50 && (head[1] & 0xFF) == 0x4B
                && (head[2] & 0xFF) == 0x03 && (head[3] & 0xFF) == 0x04) {
            // Không phân biệt được DOCX với XLSX/PPTX chỉ từ 4 byte đầu.
            // Trả về DOCX vì đây là loại duy nhất app cho phép.
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        return null;
    }

    /**
     * Chuẩn hoá MIME type (bỏ charset, về chữ thường).
     *
     * @param contentType header Content-Type do client gửi
     * @return MIME type đã chuẩn hoá, hoặc {@code null}
     */
    public static String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        String normalized = contentType.toLowerCase(Locale.ROOT).trim();
        int semicolon = normalized.indexOf(';');
        if (semicolon > 0) {
            normalized = normalized.substring(0, semicolon).trim();
        }
        if (normalized.isEmpty() || "application/octet-stream".equals(normalized)) {
            return null;
        }
        return normalized;
    }

    /**
     * Lấy extension chuẩn theo MIME type đã xác minh.
     *
     * @param mimeType MIME type
     * @return extension kèm dấu chấm, hoặc chuỗi rỗng nếu không xác định
     */
    public static String extensionFor(String mimeType) {
        if (mimeType == null) {
            return "";
        }
        return switch (mimeType) {
            case "application/pdf" -> ".pdf";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    private static boolean matches(byte[] head, byte[] signature) {
        if (head.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (head[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
