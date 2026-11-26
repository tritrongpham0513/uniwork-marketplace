package com.uniwork.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * Bảng quy đổi mức lương sang đồng/giờ — nguồn sự thật duy nhất.
 *
 * <p>Trước đây bảng này bị lặp ở nhiều nơi: {@code JobServiceImpl},
 * {@code AiContextAssembler} và 2 bản ở frontend. Mỗi bản lại có tập đơn vị
 * khác nhau — bản backend cố tình bỏ {@code PER_TASK} / {@code NEGOTIABLE} vì AI
 * không được suy luận {@code SALARY_ANOMALY} từ chúng (CONTRACT.md mục 5A.6),
 * còn bản frontend lại có {@code PER_TASK: 3}. Kết quả: quản trị viên và AI
 * nhìn thấy hai con số khác nhau cho cùng một tin.
 *
 * <p>Giờ cả hai cùng dùng bảng này, và chỉ những đơn vị **quy đổi được** mới
 * có mặt. Cùng quy tắc với frontend: {@code app/src/features/shared/lib/salary.ts}.
 */
public final class SalaryUnits {

    /**
     * Số giờ quy ước cho từng đơn vị trả lương.
     *
     * <p>Cố ý <b>không</b> có {@code PER_TASK} và {@code NEGOTIABLE}: hai đơn vị
     * này không quy đổi được, nên AI không được suy luận {@code SALARY_ANOMALY}
     * từ chúng (CONTRACT.md mục 5A.6).
     */
    private static final Map<String, Integer> HOURS_PER_UNIT = Map.of(
            "HOURLY", 1,
            "DAILY", 8,
            "WEEKLY", 40,
            "MONTHLY", 160);

    private SalaryUnits() {
    }

    /** Đơn vị trả lương nào quy đổi được sang đồng/giờ. */
    public static boolean isConvertible(String salaryType) {
        return salaryType != null && HOURS_PER_UNIT.containsKey(salaryType);
    }

    /**
     * Quy đổi mức lương sang đồng/giờ.
     *
     * @return mức lương theo đồng/giờ, hoặc {@code null} nếu đơn vị không quy
     *         đổi được (không phải {@code 0} — {@code 0} là "không có mức lương")
     */
    public static Integer toHourly(String salaryType, BigDecimal amount) {
        if (amount == null || !isConvertible(salaryType)) {
            return null;
        }
        int hours = HOURS_PER_UNIT.get(salaryType);
        return amount
                .divide(BigDecimal.valueOf(hours), 0, RoundingMode.HALF_UP)
                .intValue();
    }
}
