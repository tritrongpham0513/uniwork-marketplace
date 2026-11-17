package com.uniwork.repository;

import com.uniwork.entity.JobPostSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository cho bảng `job_post_skills`.
 */
@Repository
public interface JobPostSkillRepository extends JpaRepository<JobPostSkill, Long> {

    List<JobPostSkill> findByJobPostId(Long jobPostId);

    void deleteByJobPostId(Long jobPostId);
}
