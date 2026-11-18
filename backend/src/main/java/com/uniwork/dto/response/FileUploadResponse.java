package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả upload file — trả về cho frontend để dùng làm URL hiển thị.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {

    /** Public id của file (slug) — dùng để gọi GET/DELETE. */
    private String id;

    /** URL tuyệt đối để nhúng thẳng vào {@code <img src>} hoặc link tải CV. */
    private String url;

    /** Tên file gốc người dùng chọn (để hiển thị, ví dụ "CV-NguyenVanA.pdf"). */
    private String fileName;

    /** MIME type của file. */
    private String mimeType;

    /** Dung lượng (byte). */
    private Long sizeBytes;

    /** Loại file: CV | AVATAR | LOGO. */
    private String kind;

    /** Tên file trên disk (sinh ra ngẫu nhiên) — frontend không cần dùng. */
    private String storageKey;
}
