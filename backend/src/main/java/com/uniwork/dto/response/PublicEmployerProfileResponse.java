package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Hồ sơ NTD công khai — khớp 100% với `PublicEmployerProfile` của frontend.
 *
 * <p><b>Không được thêm trường kết quả kiểm duyệt AI</b> (CONTRACT.md mục 6).
 * Danh sách tin bên dưới dùng {@link JobResponse} — lớp gốc cố tình không có
 * trường AI — nên hồ sơ công khai không thể lộ verdict / mức độ / mã vi phạm.
 *
 * <p>Lưu ý: {@link EmployerProfileResponse} có các trường uy tín
 * ({@code isVerified}, {@code avgRating}, {@code ratingCount}) — đây là thông tin
 * uy tín của NTD, công khai hợp lệ và <b>không</b> phải kết quả kiểm duyệt AI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicEmployerProfileResponse {

    private EmployerProfileResponse profile;

    private List<JobResponse> jobs;

    private List<ReviewResponse> reviews;
}
