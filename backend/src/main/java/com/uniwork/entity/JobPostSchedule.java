package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

/**
 * Entity ánh xạ bảng `job_post_schedules` — ca làm việc trong tuần của 1 tin.
 *
 * Lưu ý: ca qua đêm (22:00 → 06:00) là hợp lệ nên không ràng buộc end > start.
 */
@Entity
@Table(name = "job_post_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPostSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_post_id", nullable = false)
    private JobPost jobPost;

    /** 1 = Thứ 2 ... 7 = Chủ nhật */
    @Column(name = "day_of_week", nullable = false)
    private Short dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
}
