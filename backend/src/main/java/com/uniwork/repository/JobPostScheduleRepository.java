package com.uniwork.repository;

import com.uniwork.entity.JobPostSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository cho bảng `job_post_schedules`.
 */
@Repository
public interface JobPostScheduleRepository extends JpaRepository<JobPostSchedule, Long> {

    List<JobPostSchedule> findByJobPostIdOrderByDayOfWeekAsc(Long jobPostId);

    void deleteByJobPostId(Long jobPostId);
}
