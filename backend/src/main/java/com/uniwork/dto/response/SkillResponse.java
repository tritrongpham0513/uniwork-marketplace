package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kỹ năng — khớp 100% với `Skill` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {

    private String id;

    private String name;
}
