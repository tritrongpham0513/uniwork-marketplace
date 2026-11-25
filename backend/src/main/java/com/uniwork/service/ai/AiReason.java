package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một lý do vi phạm do AI nêu ra.
 *
 * <p>Cấu trúc này khớp với {@code reasons[]} trong {@code responseSchema}
 * (PROMPT.md mục 4) nên provider có thể parse thẳng từ JSON của Gemini.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReason {

    /** Mã vi phạm — chỉ có 6 mã hợp lệ (CONTRACT.md mục 1). */
    private String code;

    /** Câu nguyên văn lấy từ tin tuyển dụng. */
    private String evidence;

    /** Giải thích ngắn bằng tiếng Việt. */
    private String detail;
}
