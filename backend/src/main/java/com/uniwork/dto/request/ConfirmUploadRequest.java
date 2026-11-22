package com.uniwork.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Yêu cầu xác nhận file đã upload (sau khi client PUT thẳng lên nơi lưu trữ).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfirmUploadRequest {

    /** Khóa đối tượng do backend cấp ở bước presign. */
    @NotBlank(message = "Thiếu storageKey.")
    @Size(max = 255, message = "storageKey quá dài.")
    @Pattern(regexp = "^[a-z]+/[0-9]+/[a-f0-9]{32}\\.[a-z0-9]{2,5}$",
            message = "storageKey không hợp lệ.")
    private String storageKey;

    /** Loại file: CV | AVATAR | LOGO. */
    @NotBlank(message = "Thiếu loại file.")
    @Pattern(regexp = "^(CV|AVATAR|LOGO)$", message = "Loại file không hợp lệ.")
    private String kind;

    /** Tên file gốc người dùng chọn — dùng để hiển thị. */
    @Size(max = 200, message = "Tên file quá dài.")
    private String fileName;
}
