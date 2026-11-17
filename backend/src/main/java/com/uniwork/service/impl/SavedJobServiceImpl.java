package com.uniwork.service.impl;

import com.uniwork.dto.response.SavedJobResponse;
import com.uniwork.entity.JobPost;
import com.uniwork.entity.SavedJob;
import com.uniwork.entity.StudentProfile;
import com.uniwork.repository.JobPostRepository;
import com.uniwork.repository.SavedJobRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.service.SavedJobService;
import com.uniwork.util.ApiErrors;
import com.uniwork.util.DateTimeUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Triển khai nghiệp vụ tin đã lưu.
 */
@Service
@RequiredArgsConstructor
public class SavedJobServiceImpl implements SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobPostRepository jobPostRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SavedJobResponse> list(Long userId) {
        return savedJobRepository.findByStudentUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public SavedJobResponse save(String jobId, Long userId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        StudentProfile student = studentProfileRepository.findById(userId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy hồ sơ sinh viên."));

        SavedJob existing = savedJobRepository.findByStudentUserIdAndJobPostId(userId, job.getId())
                .orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }

        SavedJob saved = SavedJob.builder()
                .slug("saved-" + java.util.UUID.randomUUID().toString().substring(0, 12))
                .student(student)
                .jobPost(job)
                .createdAt(LocalDateTime.now())
                .build();

        return toResponse(savedJobRepository.save(saved));
    }

    @Override
    @Transactional
    public void remove(String jobId, Long userId) {
        JobPost job = jobPostRepository.findBySlugAndDeletedAtIsNull(jobId)
                .orElseThrow(() -> ApiErrors.notFound("Không tìm thấy tin tuyển dụng này."));

        savedJobRepository.findByStudentUserIdAndJobPostId(userId, job.getId())
                .ifPresent(savedJobRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> listIds(Long userId) {
        return savedJobRepository.findByStudentUserIdOrderByCreatedAtDesc(userId).stream()
                .map(s -> s.getJobPost().getSlug())
                .toList();
    }

    private SavedJobResponse toResponse(SavedJob saved) {
        return SavedJobResponse.builder()
                .id(saved.getSlug())
                .jobId(saved.getJobPost().getSlug())
                .userId(saved.getStudent().getUserId())
                .createdAt(DateTimeUtils.toIso(saved.getCreatedAt()))
                .build();
    }
}
