package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Ca làm việc trong tuần — khớp 100% với `JobSchedule` của frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobScheduleResponse {

    /** 1 = Thứ 2 ... 7 = Chủ nhật */
    private Integer dayOfWeek;

    /** Định dạng "HH:mm" */
    private String startTime;

    /** Định dạng "HH:mm" */
    private String endTime;
}
