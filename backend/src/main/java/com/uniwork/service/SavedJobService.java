package com.uniwork.service;

import com.uniwork.dto.response.SavedJobResponse;

import java.util.List;

/**
 * Nghiệp vụ tin tuyển dụng đã lưu.
 */
public interface SavedJobService {

    /** Danh sách tin đã lưu. */
    List<SavedJobResponse> list(Long userId);

    /** Lưu tin tuyển dụng (idempotent). */
    SavedJobResponse save(String jobId, Long userId);

    /** Bỏ lưu tin tuyển dụng. */
    void remove(String jobId, Long userId);

    /** Danh sách public id của các tin đã lưu. */
    List<String> listIds(Long userId);
}
