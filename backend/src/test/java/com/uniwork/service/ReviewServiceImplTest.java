package com.uniwork.service;

import com.uniwork.dto.request.CreateReviewRequest;
import com.uniwork.entity.Application;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.Review;
import com.uniwork.entity.StudentProfile;
import com.uniwork.entity.User;
import com.uniwork.exception.AppException;
import com.uniwork.repository.ApplicationRepository;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WorkAssignmentRepository;
import com.uniwork.service.impl.ReviewServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test cho {@link ReviewServiceImpl} — tập trung vào
 * <b>đánh giá hai chiều</b>: sinh viên đánh giá nhà tuyển dụng và ngược lại.
 *
 * <p>Các luật nghiệp vụ được kiểm tra:
 * điểm phải nằm trong 1..5, nhận xét không được để trống, chỉ đánh giá được
 * sau khi công việc hoàn thành, mỗi người chỉ đánh giá một lần, và hướng
 * đối tượng bị đánh giá phải đúng với vai trò của người đánh giá.
 */
@ExtendWith(MockitoExtension.class)
class ReviewServiceImplTest {

    private static final Long STUDENT_USER_ID = 200L;
    private static final Long EMPLOYER_USER_ID = 100L;
    private static final String APPLICATION_SLUG = "app-abc123";

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EmployerProfileRepository employerProfileRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private WorkAssignmentRepository workAssignmentRepository;

    @InjectMocks
    private ReviewServiceImpl reviewService;

    private Application application;
    private StudentProfile studentProfile;
    private EmployerProfile employerProfile;

    @BeforeEach
    void setUp() {
        User employerUser = User.builder().id(EMPLOYER_USER_ID).email("employer@uniwork.vn").build();
        User studentUser = User.builder().id(STUDENT_USER_ID).email("student@uniwork.vn").build();

        employerProfile = EmployerProfile.builder()
                .userId(EMPLOYER_USER_ID)
                .user(employerUser)
                .displayName("Quán Cà Phê Xinh")
                .build();

        studentProfile = StudentProfile.builder()
                .userId(STUDENT_USER_ID)
                .user(studentUser)
                .fullName("Nguyễn Văn A")
                .build();

        JobPost jobPost = JobPost.builder()
                .id(1L)
                .slug("job-1")
                .title("Phục vụ ca đêm")
                .employer(employerProfile)
                .build();

        application = Application.builder()
                .id(10L)
                .slug(APPLICATION_SLUG)
                .jobPost(jobPost)
                .student(studentProfile)
                .status("COMPLETED")
                .build();
    }

    // ================================================================
    // A. VALIDATION
    // ================================================================

    @Test
    @DisplayName("Điểm ngoài khoảng 1..5 -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenRatingOutOfRange() {
        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(6)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Điểm bằng 0 -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenRatingIsZero() {
        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(0)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Điểm null -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenRatingNull() {
        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Nhận xét để trống -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenCommentBlank() {
        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("   ")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("Thiếu mã đơn ứng tuyển -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenApplicationIdMissing() {
        CreateReviewRequest req = CreateReviewRequest.builder()
                .rating(5)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    // ================================================================
    // B. ĐIỀU KIỆN ĐƠN ỨNG TUYỂN
    // ================================================================

    @Test
    @DisplayName("Đơn ứng tuyển không tồn tại -> Ném 404 NOT_FOUND")
    void create_ThrowsNotFound_WhenApplicationMissing() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.empty());

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }

    @Test
    @DisplayName("Đơn chưa hoàn thành -> Ném 400 BAD_REQUEST (chỉ đánh giá sau khi hoàn thành)")
    void create_ThrowsBadRequest_WhenApplicationNotCompleted() {
        application.setStatus("ACCEPTED");
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(reviewRepository, never()).save(any());
    }

    // ================================================================
    // C. ĐÁNH GIÁ HAI CHIỀU
    // ================================================================

    @Test
    @DisplayName("Sinh viên đánh giá -> targetType = EMPLOYER, lưu review, báo NTD")
    void create_StudentReviewsEmployer() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Nơi làm việc thân thiện")
                .build();

        reviewService.create(req, STUDENT_USER_ID, "STUDENT");

        verify(reviewRepository).save(argThat(review ->
                "EMPLOYER".equals(review.getTargetType())
                        && "STUDENT".equals(review.getReviewerRole())
                        && review.getRating() == 5
                        && "Nơi làm việc thân thiện".equals(review.getComment())));
        verify(notificationService).push(
                eq(EMPLOYER_USER_ID), eq("REVIEW"), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Nhà tuyển dụng đánh giá -> targetType = STUDENT, lưu review, báo sinh viên")
    void create_EmployerReviewsStudent() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(4)
                .comment("Ứng viên làm việc chăm chỉ")
                .build();

        reviewService.create(req, EMPLOYER_USER_ID, "EMPLOYER");

        verify(reviewRepository).save(argThat(review ->
                "STUDENT".equals(review.getTargetType())
                        && "EMPLOYER".equals(review.getReviewerRole())
                        && review.getRating() == 4));
        verify(notificationService).push(
                eq(STUDENT_USER_ID), eq("REVIEW"), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Nhà tuyển dụng đánh giá sinh viên -> điểm được ghi vào lịch sử làm việc")
    void create_EmployerReviewsStudent_SyncsWorkHistoryRating() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(4)
                .comment("Ứng viên làm việc chăm chỉ")
                .build();

        reviewService.create(req, EMPLOYER_USER_ID, "EMPLOYER");

        // Chỉ đánh giá của NTD mới ghi vào lịch sử làm việc của ứng viên.
        verify(workAssignmentRepository).findByApplicationId(application.getId());
    }

    @Test
    @DisplayName("Sinh viên đánh giá NTD -> KHÔNG ghi vào lịch sử làm việc của ứng viên")
    void create_StudentReviewsEmployer_DoesNotSyncWorkHistoryRating() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Nơi làm việc thân thiện")
                .build();

        reviewService.create(req, STUDENT_USER_ID, "STUDENT");

        verify(workAssignmentRepository, never()).findByApplicationId(anyLong());
    }

    @Test
    @DisplayName("Đã đánh giá đơn này rồi -> Ném 400 BAD_REQUEST")
    void create_ThrowsBadRequest_WhenAlreadyReviewed() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(reviewRepository.existsByApplicationIdAndReviewerId(application.getId(), STUDENT_USER_ID))
                .thenReturn(true);

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Làm việc tốt")
                .build();

        AppException ex = assertThrows(AppException.class,
                () -> reviewService.create(req, STUDENT_USER_ID, "STUDENT"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Sau khi tạo đánh giá -> điểm trung bình của người bị đánh giá được tính lại")
    void create_RecalculatesAverageRating() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reviewRepository.averageRatingFor(EMPLOYER_USER_ID)).thenReturn(4.5);
        when(reviewRepository.ratingCountFor(EMPLOYER_USER_ID)).thenReturn(2L);

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("Nơi làm việc thân thiện")
                .build();

        reviewService.create(req, STUDENT_USER_ID, "STUDENT");

        verify(reviewRepository).averageRatingFor(EMPLOYER_USER_ID);
        verify(reviewRepository).ratingCountFor(EMPLOYER_USER_ID);
    }

    @Test
    @DisplayName("Nhận xét có khoảng trắng thừa được cắt trước khi lưu")
    void create_TrimsComment() {
        when(applicationRepository.findBySlug(APPLICATION_SLUG)).thenReturn(Optional.of(application));
        when(studentProfileRepository.findById(STUDENT_USER_ID)).thenReturn(Optional.of(studentProfile));
        when(employerProfileRepository.findById(EMPLOYER_USER_ID)).thenReturn(Optional.of(employerProfile));
        when(reviewRepository.save(any(Review.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReviewRequest req = CreateReviewRequest.builder()
                .applicationId(APPLICATION_SLUG)
                .rating(5)
                .comment("  Nơi làm việc thân thiện  ")
                .build();

        reviewService.create(req, STUDENT_USER_ID, "STUDENT");

        verify(reviewRepository).save(argThat(review ->
                "Nơi làm việc thân thiện".equals(review.getComment())));
    }
}
