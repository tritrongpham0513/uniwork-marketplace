package com.uniwork.repository;

import com.uniwork.entity.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `saved_jobs` — tin tuyển dụng đã lưu.
 */
@Repository
public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {

    List<SavedJob> findByStudentUserIdOrderByCreatedAtDesc(Long studentUserId);

    Optional<SavedJob> findByStudentUserIdAndJobPostSlug(Long studentUserId, String jobSlug);

    Optional<SavedJob> findByStudentUserIdAndJobPostId(Long studentUserId, Long jobPostId);

    void deleteByStudentUserIdAndJobPostSlug(Long studentUserId, String jobSlug);
}
