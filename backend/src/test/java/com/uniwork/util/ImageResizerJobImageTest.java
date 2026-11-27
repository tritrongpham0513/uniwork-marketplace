package com.uniwork.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit test cho {@link ImageResizer} — ảnh preview tin tuyển dụng.
 *
 * <p>Ràng buộc quan trọng: <b>không crop</b>. Ảnh nhà tuyển dụng tải lên phải
 * giữ nguyên tỉ lệ gốc, chỉ giới hạn cạnh dài — phần bị che là do khung vuông
 * ở phía client, không phải do server cắt mất nội dung.
 */
class ImageResizerJobImageTest {

    @Test
    @DisplayName("Ảnh preview 2400x1200 -> resize về cạnh dài 1200px, giữ nguyên tỉ lệ")
    void resize_JobImage_KeepsAspectRatio() throws Exception {
        byte[] original = png(2400, 1200);

        ImageResizer.Result result = ImageResizer.resize(original,
                ImageResizer.MAX_DIMENSION_JOB_IMAGE);

        assertNotNull(result);
        BufferedImage out = ImageIO.read(new java.io.ByteArrayInputStream(result.content()));
        assertEquals(1200, out.getWidth());
        assertEquals(600, out.getHeight(), "Chiều cao phải giữ tỉ lệ 2:1");
    }

    @Test
    @DisplayName("Ảnh preview dọc 1000x2000 -> resize về 600x1200, KHÔNG crop thành vuông")
    void resize_JobImage_DoesNotCropToSquare() throws Exception {
        byte[] original = png(1000, 2000);

        ImageResizer.Result result = ImageResizer.resize(original,
                ImageResizer.MAX_DIMENSION_JOB_IMAGE);

        assertNotNull(result);
        BufferedImage out = ImageIO.read(new java.io.ByteArrayInputStream(result.content()));
        assertEquals(600, out.getWidth());
        assertEquals(1200, out.getHeight());
    }

    @Test
    @DisplayName("Ảnh preview nhỏ hơn giới hạn -> giữ nguyên kích thước, không phóng to")
    void resize_JobImage_DoesNotUpscale() throws Exception {
        byte[] original = png(400, 300);

        ImageResizer.Result result = ImageResizer.resize(original,
                ImageResizer.MAX_DIMENSION_JOB_IMAGE);

        assertNotNull(result);
        BufferedImage out = ImageIO.read(new java.io.ByteArrayInputStream(result.content()));
        assertEquals(400, out.getWidth());
        assertEquals(300, out.getHeight());
    }

    @Test
    @DisplayName("Avatar/logo vẫn resize về 512px (hành vi cũ không đổi)")
    void resize_Default_StaysAt512() throws Exception {
        byte[] original = png(2400, 1200);

        ImageResizer.Result result = ImageResizer.resize(original);

        assertNotNull(result);
        BufferedImage out = ImageIO.read(new java.io.ByteArrayInputStream(result.content()));
        assertEquals(512, out.getWidth());
        assertEquals(256, out.getHeight());
    }

    @Test
    @DisplayName("Ảnh preview sau resize nhẹ hơn ảnh gốc")
    void resize_JobImage_Compresses() throws Exception {
        // Ảnh nhiễu ngẫu nhiên: PNG không nén được nên giảm kích thước là do
        // resize chứ không phải do nén.
        byte[] original = noisyPng(2400, 1200);

        ImageResizer.Result result = ImageResizer.resize(original,
                ImageResizer.MAX_DIMENSION_JOB_IMAGE);

        assertNotNull(result);
        assertTrue(result.sizeBytes() < original.length,
                "Ảnh sau resize phải nhỏ hơn ảnh gốc");
    }

    /** Tạo ảnh PNG kích thước cho trước. */
    private byte[] png(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setColor(Color.BLUE);
            g.fillRect(0, 0, width, height);
        } finally {
            g.dispose();
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    /** Tạo ảnh PNG nhiễu — PNG không nén được nên dung lượng phản ánh kích thước. */
    private byte[] noisyPng(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        java.util.Random random = new java.util.Random(42);
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                image.setRGB(x, y, random.nextInt(0xFFFFFF));
            }
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
