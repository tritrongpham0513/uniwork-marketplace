package com.uniwork.constant;

/**
 * Hằng số định nghĩa các tiền tố và đường dẫn API tập trung cho hệ thống.
 * Đảm bảo tuân thủ quy ước RESTful API có version (/api/v1).
 */
public final class ApiEndpoints {

    private ApiEndpoints() {
        // Chặn khởi tạo class tiện ích
    }

    public static final String API_V1 = "/api/v1";

    // 1. Phân hệ Xác thực & Tài khoản
    public static final String V1_AUTH = API_V1 + "/auth";

    // 2. Phân hệ Sinh viên
    public static final String V1_STUDENT = API_V1 + "/student";

    // 3. Phân hệ Nhà tuyển dụng
    public static final String V1_EMPLOYER = API_V1 + "/employer";

    // 4. Phân hệ Quản trị viên
    public static final String V1_ADMIN = API_V1 + "/admin";

    // 5. Phân hệ Tin tuyển dụng công khai
    public static final String V1_PUBLIC_JOBS = API_V1 + "/jobs/public";

    // 6. Phân hệ Dữ liệu danh mục dùng chung
    public static final String V1_PUBLIC_MASTER = API_V1 + "/public";
}

