package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Uy tín của nhà tuyển dụng — ba tín hiệu mà AI dùng để đánh giá độ tin cậy.
 *
 * <p>Chỉ gồm thông tin công khai của nhà tuyển dụng: trạng thái xác minh,
 * điểm uy tín trung bình và số lượt đánh giá. Không chứa bất kỳ dữ liệu cá
 * nhân nào của sinh viên nào.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiEmployerTrust {

    /** Nhà tuyển dụng đã được quản trị viên xác minh hay chưa. */
    private Boolean verified;

    /** Điểm uy tín trung bình (thang 5.00) — {@code null} khi chưa có đánh giá. */
    private Double avgRating;

    /** Số lượt đánh giá đã nhận. */
    private Integer ratingCount;
}
