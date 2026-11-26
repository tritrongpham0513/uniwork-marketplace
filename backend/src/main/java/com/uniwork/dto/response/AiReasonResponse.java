package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một lý do vi phạm do AI nêu ra.
 *
 * <p>Chỉ xuất hiện trong response dành cho quản trị viên.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReasonResponse {

    /** Một trong 6 mã vi phạm hợp lệ. */
    private String code;

    /** Câu nguyên văn có trong tin tuyển dụng. */
    private String evidence;

    /** Giải thích ngắn bằng tiếng Việt. */
    private String detail;
}
