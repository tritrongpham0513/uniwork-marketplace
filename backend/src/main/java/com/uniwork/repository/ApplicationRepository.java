package com.uniwork.repository;

import com.uniwork.entity.Application;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository cho bảng `applications` — đơn ứng tuyển.
 */
@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    List<Application> findByStudentUserIdOrderByAppliedAtDesc(Long studentUserId);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    List<Application> findByStudentUserIdAndStatusOrderByAppliedAtDesc(Long studentUserId, String status);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    Optional<Application> findBySlug(String slug);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    Optional<Application> findByIdAndStudentUserId(Long id, Long studentUserId);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    List<Application> findByJobPostEmployerUserIdOrderByAppliedAtDesc(Long employerUserId);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    List<Application> findByJobPostEmployerUserIdAndStatusOrderByAppliedAtDesc(Long employerUserId, String status);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    List<Application> findByJobPostEmployerUserIdAndJobPostSlugOrderByAppliedAtDesc(Long employerUserId, String jobSlug);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    Optional<Application> findByIdAndJobPostEmployerUserId(Long id, Long employerUserId);

    boolean existsByJobPostIdAndStudentUserId(Long jobPostId, Long studentUserId);

    /**
     * Đơn ứng tuyển (nếu có) của sinh viên cho 1 tin.
     *
     * <p>Dùng để xử lý "ứng tuyển lại": bảng `applications` có unique constraint
     * `(job_post_id, student_id)` nên 1 SV chỉ có 1 dòng đơn cho mỗi tin — sau khi
     * rút đơn dòng đó vẫn tồn tại (status `WITHDRAWN`) và phải được kích hoạt lại
     * thay vì tạo dòng mới.
     */
    @EntityGraph(attributePaths = {"jobPost", "jobPost.employer", "student", "student.user"})
    Optional<Application> findByJobPostIdAndStudentUserId(Long jobPostId, Long studentUserId);

    /** Nhà tuyển dụng có đơn ứng tuyển nào từ sinh viên này hay không. */
    boolean existsByJobPostEmployerUserIdAndStudentUserId(Long employerUserId, Long studentUserId);

    /** CV này có đang được dùng trong đơn ứng tuyển nào không? */
    boolean existsByCvUrl(String cvUrl);

    /**
     * Nhà tuyển dụng nào đang giữ CV này trong đơn ứng tuyển.
     *
     * <p>Dùng để giới hạn ai đọc được CV đã bị gỡ khỏi hồ sơ: chỉ nhà tuyển
     * dụng có đơn ứng tuyển **trỏ tới đúng CV này** mới xem được — không phải
     * mọi NTD từng nhận đơn của sinh viên đó.
     */
    @Query("""
            SELECT DISTINCT a.jobPost.employer.userId
            FROM Application a
            WHERE a.cvUrl = :cvUrl
            """)
    List<Long> findEmployerUserIdsByCvUrl(@Param("cvUrl") String cvUrl);

    long countByJobPostIdAndStatus(Long jobPostId, String status);

    long countByStatus(String status);

    long countByStudentUserId(Long studentUserId);

    long countByJobPostEmployerUserId(Long employerUserId);
}
