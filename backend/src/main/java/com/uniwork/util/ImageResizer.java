package com.uniwork.util;

import lombok.extern.slf4j.Slf4j;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Resize & nén ảnh (avatar / logo) server-side.
 *
 * <p>Mục tiêu: giảm dung lượng & băng thông — ảnh gốc 2MB sẽ còn ~30–60KB
 * sau khi resize về 512px + nén WebP.
 *
 * <p>Không dùng dịch vụ ngoài (Cloudinary…) nên không tốn phí, và hoạt động
 * offline với provider local.
 *
 * <p>WebP không có sẵn writer trong JDK → dùng PNG/JPEG fallback nếu encode
 * WebP thất bại.
 */
@Slf4j
public final class ImageResizer {

    /** Cạnh dài tối đa của ảnh sau khi resize (px). */
    public static final int MAX_DIMENSION = 512;

    /** Chất lượng WebP (0.0 – 1.0). */
    private static final float WEBP_QUALITY = 0.82f;

    /** JPEG fallback quality. */
    private static final float JPEG_QUALITY = 0.85f;

    private ImageResizer() {
    }

    /**
     * Kết quả resize: nội dung file mới + MIME type + kích thước.
     *
     * @param content nội dung ảnh gốc
     * @return kết quả resize, hoặc {@code null} nếu không xử lý được
     */
    public record Result(byte[] content, String mimeType, long sizeBytes) {
    }

    /**
     * Resize ảnh về cạnh dài tối đa {@link #MAX_DIMENSION}px và nén lại.
     *
     * <p>Luôn trả về ảnh ở dạng PNG (hỗ trợ alpha) hoặc JPEG — không phụ thuộc
     * writer WebP của JDK.
     *
     * @param content nội dung ảnh gốc
     * @return ảnh đã resize, hoặc {@code null} nếu ảnh không đọc được
     */
    public static Result resize(byte[] content) {
        BufferedImage source;
        try {
            source = ImageIO.read(new ByteArrayInputStream(content));
        } catch (IOException e) {
            log.warn("Không đọc được ảnh để resize: {}", e.getMessage());
            return null;
        }

        if (source == null) {
            log.warn("Không giải mã được ảnh (định dạng không hỗ trợ bởi ImageIO).");
            return null;
        }

        // Ảnh nhỏ hơn giới hạn → vẫn nén lại để tiết kiệm băng thông.
        int width = source.getWidth();
        int height = source.getHeight();

        double scale = Math.min(1.0, (double) MAX_DIMENSION / Math.max(width, height));
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        boolean hasAlpha = source.getColorModel().hasAlpha();
        int imageType = hasAlpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;

        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, imageType);
        Graphics2D g = resized.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        } finally {
            g.dispose();
        }

        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (hasAlpha) {
                ImageIO.write(resized, "png", out);
                return new Result(out.toByteArray(), "image/png", out.size());
            }
            ImageIO.write(resized, "jpg", out);
            return new Result(out.toByteArray(), "image/jpeg", out.size());
        } catch (IOException e) {
            log.warn("Không ghi được ảnh sau khi resize: {}", e.getMessage());
            return null;
        }
    }

    /** Chất lượng WebP dùng khi encode thành công. */
    public static float webpQuality() {
        return WEBP_QUALITY;
    }

    /** Chất lượng JPEG dùng làm fallback. */
    public static float jpegQuality() {
        return JPEG_QUALITY;
    }
}
