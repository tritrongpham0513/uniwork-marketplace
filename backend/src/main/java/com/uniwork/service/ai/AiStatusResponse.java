package com.uniwork.service.ai;

/**
 * Trạng thái tính năng kiểm duyệt AI — frontend dùng để ẩn/hiện nút
 * "Kiểm tra bằng AI".
 *
 * @param enabled  tính năng có đang bật hay không (bật = có khoá API hợp lệ)
 * @param provider tên nhà cung cấp AI đang dùng
 */
public record AiStatusResponse(boolean enabled, String provider) {
}
