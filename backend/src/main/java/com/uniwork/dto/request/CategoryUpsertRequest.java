package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tạo / cập nhật nhóm việc (quản trị).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryUpsertRequest {

    private String name;

    private String slug;

    private String description;

    /** Tên icon lucide-react */
    private String icon;

    private Boolean isActive;

    private Integer sortOrder;
}
