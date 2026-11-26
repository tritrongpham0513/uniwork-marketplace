package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bảng xếp hạng lương cho (nhóm việc × tỉnh / thành phố) của tin tuyển dụng.
 *
 * <p>Chứa đúng bốn số mà AI cần để đối chiếu: mức trung bình, mức thấp nhất,
 * mức cao nhất và cỡ mẫu. Tất cả đã tính theo đồng/giờ.
 *
 * <p>Đối chiếu với đúng bảng mà giao diện quản trị viên hiển thị — cùng một
 * nguồn dữ liệu, cùng quy tắc chọn dòng (nhóm việc × tỉnh, lùi về tỉnh mặc định
 * khi tỉnh đó chưa có dòng).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSalaryBenchmark {

    /** Public id của nhóm việc (mã nhóm việc). */
    private String categoryId;

    /** Tên nhóm việc — để AI đọc được ngữ cảnh bằng tiếng Việt. */
    private String categoryName;

    /** Public id của tỉnh / thành phố (mã tỉnh). */
    private String provinceId;

    /** Tên tỉnh / thành phố. */
    private String provinceName;

    /** Mức lương trung bình (đồng/giờ). */
    private Integer avgHourly;

    /** Mức lương thấp nhất (đồng/giờ). */
    private Integer minHourly;

    /** Mức lương cao nhất (đồng/giờ). */
    private Integer maxHourly;

    /** Cỡ mẫu — số tin được tính vào bảng xếp hạng. */
    private Integer sampleSize;
}
