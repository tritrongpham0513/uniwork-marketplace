package com.uniwork.dto.request;

import lombok.Data;

/**
 * Payload tạo / cập nhật vị trí công việc (admin).
 */
@Data
public class PositionUpsertRequest {

    /** Mã hoặc slug của nhóm việc cha. */
    private String categoryId;

    private String name;
    private String slug;
    private Integer sortOrder;
    private Boolean isActive;
}
