package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng {@code file_uploads} — metadata của file đã upload
 * (CV của sinh viên, avatar, logo của nhà tuyển dụng).
 *
 * <p>File nhị phân không lưu trong DB mà nằm trên disk; cột
 * {@code storageKey} trỏ tới tên file thực tế trong thư mục lưu trữ.
 */
@Entity
@Table(name = "file_uploads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    /** ID công khai (string) — frontend dùng giá trị này trong URL. */
    @Column(name = "slug", nullable = false, unique = true, length = 80)
    private String slug;

    /** Người đã upload (chủ sở hữu file). */
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    /** CV | AVATAR | LOGO */
    @Column(name = "kind", nullable = false, length = 20)
    private String kind;

    /** Tên file thực tế trên disk (đã giữ extension gốc, không chứa đường dẫn). */
    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    /** Tên file người dùng chọn — dùng để hiển thị (ví dụ "CV-NguyenVanA.pdf"). */
    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "mime_type", nullable = false, length = 120)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /** Xoá mềm — file vẫn còn trên disk cho tới khi dọn dẹp định kỳ. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
