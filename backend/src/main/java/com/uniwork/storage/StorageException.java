package com.uniwork.storage;

/**
 * Lỗi khi thao tác với nơi lưu trữ file (ghi / đọc / xoá).
 *
 * <p>Được chuyển thành lỗi HTTP 400/500 ở tầng controller.
 */
public class StorageException extends RuntimeException {

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
