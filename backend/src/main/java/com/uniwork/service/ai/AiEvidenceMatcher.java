package com.uniwork.service.ai;

import java.text.Normalizer;

/**
 * Kiểm tra bằng chứng AI có thực sự là câu nguyên văn trong tin hay không.
 *
 * <p>Quy tắc chuẩn hoá (CONTRACT.md mục 5A.4) — dùng chung với script Node
 * {@code backend/scripts/ai-moderation/run.mjs}:
 * <ol>
 *   <li>Unicode NFC</li>
 *   <li>Gộp khoảng trắng thừa thành một dấu cách</li>
 *   <li>Không phân biệt hoa/thường</li>
 * </ol>
 *
 * <p>Cố ý <b>không</b> dùng so khớp mờ (fuzzy/Levenshtein): mục tiêu là phát
 * hiện AI bịa câu trích, nên phải khớp tuyệt đối sau chuẩn hoá.
 */
public final class AiEvidenceMatcher {

    private AiEvidenceMatcher() {
    }

    /**
     * @param evidence    câu AI cho là trích nguyên văn
     * @param jobContent  toàn bộ nội dung tin tuyển dụng đã dựng thành văn bản
     * @return {@code true} nếu câu trích xuất hiện nguyên văn trong tin
     */
    public static boolean isVerbatim(String evidence, String jobContent) {
        if (evidence == null || evidence.isBlank() || jobContent == null || jobContent.isBlank()) {
            return false;
        }
        return normalize(jobContent).contains(normalize(evidence));
    }

    /** Chuẩn hoá chuỗi để so khớp bỏ qua khác biệt dấu/khoảng trắng/hoa thường. */
    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String nfc = Normalizer.normalize(value, Normalizer.Form.NFC);
        return nfc.replaceAll("\\s+", " ").trim().toLowerCase();
    }
}
