package com.uniwork.service;

/**
 * Interface nghiệp vụ gửi email thông báo hệ thống (kích hoạt tài khoản, thông báo).
 */
public interface MailService {

    /**
     * Gửi email kích hoạt tài khoản bất đồng bộ (@Async).
     *
     * @param toEmail  Địa chỉ người nhận
     * @param fullName Họ và tên người nhận
     * @param rawToken Mã token xác thực gốc (chưa hash)
     */
    void sendVerificationEmail(String toEmail, String fullName, String rawToken);
}

