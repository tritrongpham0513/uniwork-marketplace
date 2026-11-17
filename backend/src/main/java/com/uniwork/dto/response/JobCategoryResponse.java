package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Nhóm việc — khớp 100% với `JobCategory` của frontend
 * (app/src/features/shared/types/index.ts).
 *
 * `id` là public id dạng string (ví dụ "cat-fnb").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobCategoryResponse {

    private String id;

    private String name;

    private String slug;

    private String description;

    /** Tên icon lucide-react dùng để render động */
    private String icon;

    /** Số tin tuyển dụng đang mở trong nhóm này */
    private Integer jobCount;

    private Boolean isActive;

    private Integer sortOrder;
}
