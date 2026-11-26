package com.uniwork.service.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Mức lương của tin tuyển dụng đã chuẩn hoá về đồng/giờ.
 *
 * <p>Cần cả hai thông tin: đơn vị trả lương gốc nhà tuyển dụng khai báo
 * (để AI hiểu tin đó trả theo ca / theo ngày / theo tháng) và mức đã quy đổi
 * về đồng/giờ (để so với bảng xếp hạng lương, vốn tính theo đồng/giờ).
 *
 * <p>Quy tắc quan trọng (CONTRACT.md mục 5A.6): {@code PER_TASK} và
 * {@code NEGOTIABLE} <b>không</b> quy đổi được — mức đồng/giờ của hai kiểu này
 * là {@code null}. AI không được suy luận {@code SALARY_ANOMALY} từ chúng.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSalaryInfo {

    /** Đơn vị trả lương gốc: HOURLY | DAILY | WEEKLY | MONTHLY | PER_TASK | NEGOTIABLE. */
    private String salaryType;

    /** Mức lương tối thiểu nhà tuyển dụng khai báo (đúng đơn vị gốc). */
    private Integer originalMin;

    /** Mức lương tối đa nhà tuyển dụng khai báo (đúng đơn vị gốc). */
    private Integer originalMax;

    /** Mức lương tối thiểu quy đổi về đồng/giờ — {@code null} nếu không quy đổi được. */
    private Integer hourlyMin;

    /** Mức lương tối đa quy đổi về đồng/giờ — {@code null} nếu không quy đổi được. */
    private Integer hourlyMax;

    /** Mức lương có quy đổi được về đồng/giờ hay không. */
    public boolean isConvertible() {
        return hourlyMin != null || hourlyMax != null;
    }
}
