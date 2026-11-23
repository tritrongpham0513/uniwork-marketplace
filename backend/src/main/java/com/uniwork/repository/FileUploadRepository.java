package com.uniwork.repository;

import com.uniwork.entity.FileUpload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository quản lý metadata file đã upload.
 */
@Repository
public interface FileUploadRepository extends JpaRepository<FileUpload, Long> {

    Optional<FileUpload> findBySlugAndDeletedAtIsNull(String slug);

    Optional<FileUpload> findByIdAndDeletedAtIsNull(Long id);

    /** Dùng cho confirm idempotent: client gửi lại cùng storageKey không tạo bản ghi trùng. */
    Optional<FileUpload> findByOwnerUserIdAndStorageKeyAndDeletedAtIsNull(Long ownerUserId, String storageKey);

    List<FileUpload> findByOwnerUserIdAndKindAndDeletedAtIsNull(Long ownerUserId, String kind);

    /**
     * File còn chiếm dung lượng: đang sống, hoặc đã xoá mềm nhưng còn giữ blob.
     *
     * <p>File đã xoá mềm mà giữ blob vẫn nằm trên R2 → vẫn phải tính vào quota
     * dung lượng, nếu không người dùng tích tụ file vô hạn mà không bị chặn.
     */
    @Query("""
            SELECT f FROM FileUpload f
            WHERE f.ownerUserId = :ownerUserId
              AND f.kind = :kind
              AND (f.deletedAt IS NULL OR f.blobKept = TRUE)
            """)
    List<FileUpload> findByOwnerUserIdAndKindAndStillStored(
            @Param("ownerUserId") Long ownerUserId, @Param("kind") String kind);

    /**
     * File còn đọc được: đang sống, hoặc đã xoá mềm nhưng còn giữ blob.
     *
     * <p>File đã xoá mềm mà giữ blob là CV còn bị đơn ứng tuyển trỏ tới —
     * nhà tuyển dụng vẫn xem được CV đúng như lúc sinh viên nộp, dù SV đã
     * gỡ CV khỏi hồ sơ.
     */
    @Query("""
            SELECT f FROM FileUpload f
            WHERE f.slug = :slug
              AND (f.deletedAt IS NULL OR f.blobKept = TRUE)
            """)
    Optional<FileUpload> findReadableBySlug(@Param("slug") String slug);
}
