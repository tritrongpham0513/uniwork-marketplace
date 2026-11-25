package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Đầu vào cho nhà cung cấp AI — nội dung tin tuyển dụng đã dựng sẵn thành văn bản.
 *
 * <p>Đây là hợp đồng giữa {@link AiReviewService} và {@link AiProvider}. Tách
 * "dữ liệu đầu vào" khỏi "cách dựng prompt" để ticket 03 có thể bổ sung thêm
 * ngữ cảnh (xếp hạng lương, uy tín nhà tuyển dụng) mà không phải sửa provider.
 *
 * <p>Hiện tại chỉ có {@link #jobContent} — phần nội dung tin tuyển dụng dạng văn bản
 * (tiêu đề, mô tả, yêu cầu, quyền lợi, địa điểm, mức lương...).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReviewInput {

    /** Nội dung tin tuyển dụng dạng văn bản — nguồn duy nhất để AI đối chiếu bằng chứng. */
    private String jobContent;
}
