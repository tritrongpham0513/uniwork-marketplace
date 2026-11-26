package com.uniwork.service.ai;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bảo đảm khối chỉ dẫn gửi cho AI của backend Java và script Node
 * {@code backend/scripts/ai-moderation/prompt.mjs} khớp <b>nguyên văn</b>.
 *
 * <p>ADR 0005 mục 3: hai bên phải dùng cùng một khối chỉ dẫn. Nếu lệch nhau,
 * mọi so khớp bằng chứng sau đó đều không đáng tin — và người đánh giá tay bằng
 * script Node sẽ đang đánh giá một prompt khác với prompt ứng dụng thật dùng.
 *
 * <p>Prompt lấy từ {@code .scratch/ai-moderation/PROMPT.md} mục 5 (bản ASCII) —
 * file đó nằm ngoài module backend nên test chỉ đối chiếu khi có sẵn (chạy từ
 * repo, không chạy trong ảnh Docker chỉ copy {@code backend/}).
 */
class AiPromptParityTest {

    /** Script Node nằm trong module backend — luôn có sẵn. */
    private static final Path PROMPT_MJS =
            Paths.get("scripts", "ai-moderation", "prompt.mjs");

    /** PROMPT.md nằm ở gốc repo — có thể không tồn tại khi chạy trong ảnh Docker. */
    private static final Path PROMPT_MD =
            Paths.get("..", ".scratch", "ai-moderation", "PROMPT.md");

    /** Marker bắt đầu / kết thúc khối chỉ dẫn ASCII trong PROMPT.md. */
    private static final Pattern MD_BLOCK = Pattern.compile(
            "\\*\\*ASCII cua phan chi dan\\*\\*[^`]*```text\\n(.*?)```",
            Pattern.DOTALL);

    /** Marker bắt đầu / kết thúc khối chỉ dẫn ASCII trong prompt.mjs. */
    private static final Pattern MJS_BLOCK = Pattern.compile(
            "export const INSTRUCTIONS = `(.*?)`;", Pattern.DOTALL);

    @Test
    @DisplayName("Khối chỉ dẫn ở AiPromptBuilder.java và prompt.mjs khớp nguyên văn")
    void instructions_MatchBetweenJavaAndNode() throws Exception {
        String fromJava = AiPromptBuilder.instructions();
        String fromNode = extractNodeBlock();

        assertEquals(normalize(fromJava), normalize(fromNode),
                "Khối chỉ dẫn lệch giữa AiPromptBuilder.java và prompt.mjs — "
                        + "sửa PROMPT.md trước rồi đồng bộ sang cả hai.");
    }

    @Test
    @DisplayName("Khối chỉ dẫn ở PROMPT.md khớp nguyên văn với bản dùng thật")
    void instructions_MatchWithPromptMarkdown() throws Exception {
        Assumptions.assumeTrue(Files.exists(PROMPT_MD),
                "PROMPT.md không có trong môi trường chạy test này");

        assertEquals(normalize(extractMarkdownBlock()), normalize(AiPromptBuilder.instructions()),
                "Khối chỉ dẫn ở AiPromptBuilder.java lệch với PROMPT.md — "
                        + "sửa PROMPT.md trước rồi đồng bộ sang Java.");
    }

    @Test
    @DisplayName("Khối chỉ dẫn nói rõ bằng chứng chỉ được trích từ nội dung nhà tuyển dụng viết")
    void instructions_ConstrainEvidenceSource() {
        String instructions = AiPromptBuilder.instructions();

        assertTrue(instructions.contains("chi duoc trich tu noi dung DO NHA TUYEN DUNG VIET"),
                "Phải chỉ định rõ bằng chứng chỉ được trích từ nội dung nhà tuyển dụng viết: "
                        + instructions);
        assertTrue(instructions.contains("KHONG duoc trich tu cac dong"),
                "Phải chỉ định rõ không được trích từ dòng số liệu hệ thống: " + instructions);
    }

    @Test
    @DisplayName("Khung khối dữ liệu ở Java và Node khớp nguyên văn")
    void dataBlock_MatchBetweenJavaAndNode() throws Exception {
        String nodeBlock = extractNodeDataBlock();

        assertTrue(nodeBlock.contains("<TIN_TUYEN_DUNG>"), nodeBlock);
        assertEquals(normalize(nodeBlock), normalize(AiPromptBuilder.buildDataBlock("{0}")),
                "Khung khối dữ liệu lệch giữa Java và Node.");
    }

    /**
     * Chuẩn hoá để so sánh nội dung, bỏ qua xuống dòng cuối.
     *
     * <p>Java text block ({@code """}) luôn kết thúc bằng ký tự xuống dòng, còn
     * template literal của Node thì không — khác biệt này không ảnh hưởng nội
     * dung prompt gửi đi, nên không được coi là lệch.
     */
    private String normalize(String value) {
        return value.strip().replaceAll("\\s+", " ");
    }

    /** Bóc khối chỉ dẫn ASCII trong PROMPT.md. */
    private String extractMarkdownBlock() throws Exception {
        String content = Files.readString(PROMPT_MD, StandardCharsets.UTF_8);
        Matcher matcher = MD_BLOCK.matcher(content);
        assertTrue(matcher.find(), "Không tìm thấy khối chỉ dẫn ASCII trong PROMPT.md");
        return matcher.group(1).strip();
    }

    /** Bóc khối chỉ dẫn trong prompt.mjs. */
    private String extractNodeBlock() throws Exception {
        String content = Files.readString(PROMPT_MJS, StandardCharsets.UTF_8);
        Matcher matcher = MJS_BLOCK.matcher(content);
        assertTrue(matcher.find(), "Không tìm thấy INSTRUCTIONS trong prompt.mjs");
        return matcher.group(1).strip();
    }

    /** Bóc khung khối dữ liệu trong prompt.mjs. */
    private String extractNodeDataBlock() throws Exception {
        String content = Files.readString(PROMPT_MJS, StandardCharsets.UTF_8);
        Pattern pattern = Pattern.compile(
                "export const DATA_BLOCK_TEMPLATE = `(.*?)`;", Pattern.DOTALL);
        Matcher matcher = pattern.matcher(content);
        assertTrue(matcher.find(), "Không tìm thấy DATA_BLOCK_TEMPLATE trong prompt.mjs");
        return matcher.group(1);
    }
}
