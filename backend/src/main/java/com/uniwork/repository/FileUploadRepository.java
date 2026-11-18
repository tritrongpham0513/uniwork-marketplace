package com.uniwork.repository;

import com.uniwork.entity.FileUpload;
import org.springframework.data.jpa.repository.JpaRepository;
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

    List<FileUpload> findByOwnerUserIdAndKindAndDeletedAtIsNull(Long ownerUserId, String kind);
}
