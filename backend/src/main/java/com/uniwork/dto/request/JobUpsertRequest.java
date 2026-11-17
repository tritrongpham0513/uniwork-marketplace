package com.uniwork.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Tạo / cập nhật tin tuyển dụng.
 *
 * Nhận **đúng shape nested** mà form frontend gửi
 * (xem `CreateJobPayload` trong `app/src/features/employer/services/employer-jobs.service.ts`).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobUpsertRequest {

    private String title;

    private String description;

    private List<String> requirements;

    private List<String> benefits;

    /** Nhóm việc — nested object { id, name, ... } */
    private CategoryRef category;

    /** Vị trí công việc — nested object { id, name, ... } hoặc null */
    private PositionRef position;

    /** FULL_TIME | PART_TIME | FLEXIBLE | CASUAL */
    private String employmentType;

    /** ONSITE | REMOTE | HYBRID */
    private String workMode;

    /** HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE */
    private String salaryType;

    private Integer salaryMin;

    private Integer salaryMax;

    /** Địa điểm — nested object */
    private LocationRef location;

    private Integer positionsCount;

    private Integer positionsFilled;

    /** Danh sách ca làm việc */
    private List<ScheduleRef> schedules;

    /** Danh sách kỹ năng — nested object { id, name } */
    private List<SkillRef> skills;

    /** Hạn nộp hồ sơ (ISO) */
    private String deadline;

    // ------------------------------------------------------------------
    // Nested refs
    // ------------------------------------------------------------------

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryRef {
        private String id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PositionRef {
        private String id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationRef {
        private String provinceId;
        private String province;
        private String districtId;
        private String district;
        private String address;
        private String branchName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScheduleRef {
        private Integer dayOfWeek;
        private String startTime;
        private String endTime;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillRef {
        private String id;
        private String name;
    }
}
