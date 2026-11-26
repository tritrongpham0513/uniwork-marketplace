#!/usr/bin/env node
/**
 * Cong cu thu prompt kiem duyet tin tuyen dung bang AI (Gemini).
 *
 * Muc dich: chay THU prompt truoc khi dua vao backend Java — dung prompt, kiem
 * tra JSON co parse duoc khong, bang chung co that la cau nguyen van khong.
 * Thu prompt re hon thu ma (spec.md "Ba viec can lam truoc khi viet ma", muc 2).
 *
 * Cach dung:
 *   node backend/scripts/ai-moderation/run.mjs --dry-run
 *   node backend/scripts/ai-moderation/run.mjs --sample mau-01-dat-coc
 *   node backend/scripts/ai-moderation/run.mjs
 *
 * Khoa API chi duoc lay tu bien moi truong `GEMINI_API_KEY`. KHONG hardcode,
 * KHONG ghi ra log, KHONG in ra man hinh.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildDataBlock,
  buildPrompt,
  INSTRUCTIONS,
  RESPONSE_SCHEMA,
  VIOLATION_CODE_SET,
} from "./prompt.mjs";
import { SAMPLES } from "./samples.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, "..", "..");
const REPO_DIR = path.resolve(BACKEND_DIR, "..");
const DEFAULT_REPORT_PATH = path.join(
  REPO_DIR,
  ".scratch",
  "ai-moderation",
  "notes",
  "01-bao-cao-thu.json",
);

/** Model dung cho thu — giong het voi gia tri mac dinh trong `application.yml` (CONTRACT.md muc 4). */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Đơn vị trả lương -> số giờ quy đổi, dùng để chuẩn hoá mức lương về đồng/giờ.
 *
 * Cố ý KHÔNG có `PER_TASK` và `NEGOTIABLE`: hai đơn vị này không quy đổi được,
 * nên AI không được suy luận `SALARY_ANOMALY` từ chúng (CONTRACT.md mục 5A.6).
 * Cùng bảng với `backend/.../util/SalaryUnits.java` và
 * `app/src/features/shared/lib/salary.ts`.
 */
const HOURS_PER_SALARY_UNIT = Object.freeze({
  HOURLY: 1,
  DAILY: 8,
  WEEKLY: 40,
  MONTHLY: 160,
});

/**
 * Chuẩn hoá mức lương về đồng/giờ.
 *
 * Lý do cần: bang xep hang luong trong he thong tinh theo dong/gio, nen mau
 * cung phai quy doi ve cung don vi de so sanh cong bang. "PER_TASK" khong quy
 * doi duoc (khong biet gio cong) — dat 0 de bao cao bo qua, khong gan bang 0
 * nham lam sai.
 *
 * @param {number} amount Mức lương.
 * @param {string} salaryType Đơn vị trả lương.
 * @returns {number} Mức lương quy đổi (đồng/giờ), 0 nếu không quy đổi được.
 */
function toHourly(amount, salaryType) {
  const hours = HOURS_PER_SALARY_UNIT[salaryType];
  if (!hours) return 0;
  return Math.round(amount / hours);
}

/**
 * Dựng nội dung tin tuyển dụng (phần dữ liệu, không phải phần chỉ dẫn).
 *
 * Thứ tự các trường bám theo ví dụ trong PROMPT.md muc 3 để backend Java
 * (ticket 02) dễ đối chiếu từng dòng khi hai bên khác nhau.
 *
 * @param {object} sample Mẫu tin tuyển dụng.
 * @returns {string} Nội dung tin dạng văn bản.
 */
export function buildJobContent(sample) {
  const lines = [];
  lines.push(`Tieu de: ${sample.title}`);
  lines.push("Mo ta:");
  lines.push(sample.description);
  lines.push("Yeu cau:");
  for (const requirement of sample.requirements) {
    lines.push(`  - ${requirement}`);
  }
  lines.push("Quyen loi:");
  for (const benefit of sample.benefits) {
    lines.push(`  - ${benefit}`);
  }
  lines.push(`Dia diem: ${sample.location}`);
  lines.push(`Nhom viec: ${sample.category}`);

  const hourlyMin = toHourly(sample.salaryMin, sample.salaryType);
  const hourlyMax = toHourly(sample.salaryMax, sample.salaryType);
  if (hourlyMin > 0 && hourlyMax > 0) {
    lines.push(
      `Muc luong: ${sample.salaryType}, tu ${sample.salaryMin} den ${sample.salaryMax} ` +
        `VND${sample.salaryType === "HOURLY" ? "/gio" : ""} ` +
        `(quy doi ${hourlyMin} - ${hourlyMax} VND/gio)`,
    );
  } else {
    lines.push(
      `Muc luong: ${sample.salaryType}, tu ${sample.salaryMin} den ${sample.salaryMax} ` +
        `(khong quy doi duoc sang VND/gio)`,
    );
  }

  if (sample.benchmark) {
    lines.push(
      `Xep hang luong nhom viec "${sample.category}" tai ${sample.location}: ` +
        `trung binh ${sample.benchmark.avg} VND/gio, thap nhat ${sample.benchmark.min}, ` +
        `cao nhat ${sample.benchmark.max}, co mau ${sample.benchmark.sampleSize} tin`,
    );
  }

  const employer = sample.employer;
  lines.push(
    `Uy tin nha tuyen dung: ${employer.isVerified ? "da xac minh" : "chua xac minh"}, ` +
      `diem uy tin trung binh ${employer.avgRating}/5 tren ${employer.ratingCount} danh gia`,
  );

  return lines.join("\n");
}

/**
 * Chuan hoa chuoi de so khop "nguyen van" ma khong so voi khac biet viet hoa.
 *
 * Ly do: AI thuong bo dau cham, doi chu hoa/thuong, hoac doi dau xuong cua mot
 * tu khi trich. Neu so khop nguyen xi (byte-for-byte) thi quy tac "bang chung
 * nguyen van" se loai oan rat nhieu ly do hop le. Vay nen chuan hoa ve dang
 * de so sanh, va ghi nhan dang chuan hoa de nguoi doc doi chieu duoc.
 *
 * @param {string} text Chuoi can chuan hoa.
 * @returns {string} Chuoi da bo khoang trang thua va chuan hoa dau.
 */
function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Kiem tra "evidence" co that su xuat hien trong noi dung tin khong.
 *
 * @param {string} evidence Cau trich dan.
 * @param {string} jobContent Noi dung tin (nguyen ban).
 * @returns {boolean} True neu evidence xuat hien trong tin.
 */
export function isEvidenceVerbatim(evidence, jobContent) {
  const normalizedEvidence = normalizeText(evidence);
  if (!normalizedEvidence) return false;
  return normalizeText(jobContent).includes(normalizedEvidence);
}

/**
 * Kiem tra ket qua tra ve co dung cau truc khong.
 *
 * @param {unknown} parsed JSON da parse.
 * @returns {{ isValid: boolean, errors: string[] }} Danh sach loi.
 */
export function validateShape(parsed) {
  const errors = [];
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { isValid: false, errors: ["Ket qua khong phai mot object JSON."] };
  }
  if (!["OK", "WARN", "SUSPECT"].includes(parsed.verdict)) {
    errors.push(`verdict khong hop le: "${parsed.verdict}"`);
  }
  if (typeof parsed.summary !== "string" || parsed.summary.trim() === "") {
    errors.push("summary thieu hoac khong phai chuoi.");
  }
  if (!Array.isArray(parsed.reasons)) {
    errors.push("reasons khong phai mang.");
    return { isValid: false, errors };
  }
  for (const [index, reason] of parsed.reasons.entries()) {
    if (!reason || typeof reason !== "object") {
      errors.push(`reasons[${index}] khong phai object.`);
      continue;
    }
    if (!VIOLATION_CODE_SET.has(reason.code)) {
      errors.push(`reasons[${index}].code khong hop le: "${reason.code}"`);
    }
    if (typeof reason.evidence !== "string" || reason.evidence.trim() === "") {
      errors.push(`reasons[${index}].evidence thieu hoac khong phai chuoi.`);
    }
    if (typeof reason.detail !== "string" || reason.detail.trim() === "") {
      errors.push(`reasons[${index}].detail thieu hoac khong phai chuoi.`);
    }
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Loc cac ly do theo dung luat: ma hop le + bang chung nguyen van trong tin.
 *
 * Day la hien thuc cua quy tac "khong trich duoc cau nguyen van thi khong duoc dua
 * ma do vao ket qua" (CONTRACT.md muc 5.5). Ly do khong khop se bi LOAI BO,
 * khong phai chi danh dau.
 *
 * @param {object[]} reasons Danh sach ly do tho.
 * @param {string} jobContent Noi dung tin.
 * @returns {{ kept: object[], dropped: object[] }} Ly do giu lai va ly do bi loai.
 */
export function filterReasons(reasons, jobContent) {
  const kept = [];
  const dropped = [];
  for (const reason of reasons ?? []) {
    const code = reason?.code;
    const evidence = reason?.evidence;
    if (!VIOLATION_CODE_SET.has(code)) {
      dropped.push({ ...reason, dropReason: `Ma vi pham khong hop le: "${code}"` });
      continue;
    }
    if (typeof evidence !== "string" || evidence.trim() === "") {
      dropped.push({ ...reason, dropReason: "Khong co bang chung." });
      continue;
    }
    if (!isEvidenceVerbatim(evidence, jobContent)) {
      dropped.push({
        ...reason,
        dropReason: `Bang chung khong xuat hien nguyen van trong tin: "${evidence}"`,
      });
      continue;
    }
    kept.push(reason);
  }
  return { kept, dropped };
}

/**
 * Goi Gemini `generateContent` voi responseSchema co dinh.
 *
 * @param {string} prompt Prompt day du.
 * @param {string} apiKey Khoa API (lay tu bien moi truong).
 * @param {string} model Ten model.
 * @returns {Promise<object>} JSON tho ra tu model.
 */
async function callGemini(prompt, apiKey, model) {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      // KHONG in ra header hay body chua khoa — chi ghi ma loi de toi thieu.
      let detail = raw.slice(0, 500);
      try {
        const parsedError = JSON.parse(raw);
        detail = parsedError?.error?.message ?? detail;
      } catch {
        // Body khong phai JSON — giu nguyen ban cat ngan.
      }
      throw new Error(`Gemini tra loi ${response.status}: ${detail}`);
    }

    const payload = JSON.parse(raw);
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("");
    if (!text) {
      throw new Error(
        `Gemini khong tra ve noi dung: ${JSON.stringify(payload?.candidates?.[0] ?? {}).slice(0, 500)}`,
      );
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * In bang bao cao cho mot mau.
 *
 * @param {object} sample Mẫu tin tuyển dụng.
 * @param {object} result Kết quả đã xử lý.
 * @returns {void}
 */
function printSampleReport(sample, result) {
  const lines = [];
  lines.push("=".repeat(78));
  lines.push(`MAU: ${sample.id} — ${sample.title}`);
  lines.push(`Ky vong: ${sample.expected}`);
  lines.push(`Verdict nhan duoc: ${result.verdict ?? "(khong co)"}`);
  lines.push(`Tóm tắt: ${result.summary ?? "(khong co)"}`);

  if (result.shapeErrors?.length) {
    lines.push("");
    lines.push("SAI CẤU TRÚC (sẽ không được ghi vào DB):");
    for (const error of result.shapeErrors) {
      lines.push(`  - ${error}`);
    }
  }

  lines.push("");
  lines.push(`Lý do được giữ (${result.reasons.length}):`);
  if (result.reasons.length === 0) {
    lines.push("  (không có)");
  }
  for (const reason of result.reasons) {
    lines.push(`  [${reason.code}]`);
    lines.push(`    evidence: "${reason.evidence}"`);
    lines.push(`    detail  : ${reason.detail}`);
  }

  if (result.droppedReasons.length > 0) {
    lines.push("");
    lines.push(`Lý do bị LOẠI BÓ vì vi phạm quy tắc (${result.droppedReasons.length}):`);
    for (const dropped of result.droppedReasons) {
      lines.push(`  [${dropped.code ?? "?"}] ${dropped.dropReason}`);
    }
  }

  lines.push("");
  lines.push("Đánh giá tay:");
  lines.push(`  - Verdict đúng kỳ vọng: ${result.verdictMatches ? "CÓ" : "KHÔNG"}`);
  lines.push(`  - Mọi bằng chứng là câu nguyên văn: ${result.evidenceAllVerbatim ? "CÓ" : "KHÔNG"}`);
  lines.push(`  - Verdict OK thì reasons rỗng: ${result.okHasNoReasons ? "CÓ" : "KHÔNG"}`);
  lines.push("");
  console.log(lines.join("\n"));
}

/**
 * Kiem tra verdict co khop voi ky vong cua mau khong.
 *
 * Ky vong duoc viet la chuoi tu do nguoi viet (vi du "WARN hoac SUSPECT + ...").
 * Cach kiem tra giay "co chua ma vi pham mong doi" + "co nam trong tap verdict
 * duoc chap nhan" — dung cho ca truong hop "WARN hoac SUSPECT".
 *
 * @param {object} sample Mẫu tin tuyển dụng.
 * @param {object} result Kết quả đã xử lý.
 * @returns {boolean} True nếu khớp.
 */
function verdictMatchesExpectation(sample, result) {
  const expected = String(sample.expected ?? "");
  const acceptedVerdicts = [];
  if (expected.includes("SUSPECT")) acceptedVerdicts.push("SUSPECT");
  if (expected.includes("WARN")) acceptedVerdicts.push("WARN");
  if (expected.startsWith("OK")) acceptedVerdicts.push("OK");
  if (acceptedVerdicts.length === 0) return false;
  if (!acceptedVerdicts.includes(result.verdict)) return false;

  const codes = [...VIOLATION_CODE_SET].filter((code) => expected.includes(code));
  if (codes.length === 0) return true;
  const actualCodes = new Set(result.reasons.map((reason) => reason.code));
  return codes.every((code) => actualCodes.has(code));
}

/**
 * Phan tich CLI.
 *
 * @param {string[]} argv Danh sach tham so.
 * @returns {{ isDryRun: boolean, sampleId: string|null, reportPath: string, model: string }}.
 */
export function parseArgs(argv) {
  const options = {
    isDryRun: false,
    sampleId: null,
    reportPath: DEFAULT_REPORT_PATH,
    model: process.env.AI_MODEL || DEFAULT_MODEL,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.isDryRun = true;
    } else if (arg === "--sample") {
      options.sampleId = argv[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith("--sample=")) {
      options.sampleId = arg.slice("--sample=".length);
    } else if (arg === "--report") {
      options.reportPath = path.resolve(argv[i + 1] ?? DEFAULT_REPORT_PATH);
      i += 1;
    } else if (arg.startsWith("--report=")) {
      options.reportPath = path.resolve(arg.slice("--report=".length));
    } else if (arg === "--model") {
      options.model = argv[i + 1] ?? DEFAULT_MODEL;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    }
  }
  return options;
}

/**
 * In huong dan su dung.
 *
 * @returns {void}
 */
function printHelp() {
  console.log(
    [
      "Cong cu thu prompt kiem duyet tin tuyen dung bang AI (Gemini).",
      "",
      "Dung:",
      "  node backend/scripts/ai-moderation/run.mjs [tuy chon]",
      "",
      "Tuy chon:",
      "  --dry-run            In prompt + schema, KHONG goi mang. Khong can khoa API.",
      "  --sample <id>        Chi chay mot mau (xem danh sach id bang --list).",
      "  --list               Liet ke cac mau co san.",
      "  --report <duong dan> Duong dan ghi bao cao JSON (mac dinh: .scratch/ai-moderation/notes/01-bao-cao-thu.json).",
      "  --model <ten model>  Model su dung (mac dinh: gemini-3.5-flash-lite).",
      "",
      "Bien moi truong:",
      "  GEMINI_API_KEY       Khoa API Gemini. Chi doc tu moi truong, KHONG ghi log.",
    ].join("\n"),
  );
}

/**
 * Chay thu tren mot mau.
 *
 * @param {object} sample Mẫu tin tuyển dụng.
 * @param {string} apiKey Khoa API.
 * @param {string} model Tên model.
 * @returns {Promise<object>} Kết quả đã xử lý, kèm thông tin kiểm tra.
 */
async function reviewSample(sample, apiKey, model) {
  const jobContent = buildJobContent(sample);
  const prompt = buildPrompt(jobContent);

  const parsed = await callGemini(prompt, apiKey, model);
  const shape = validateShape(parsed);
  const { kept, dropped } = filterReasons(shape.isValid ? parsed.reasons : [], jobContent);

  // Verdict OK ma van co ly do -> cau truc sai, phai bao loi de quang tri vien
  // khong tin nham. Backend cung phai tu choi truong hop nay.
  const okHasNoReasons = parsed?.verdict !== "OK" || kept.length === 0;

  return {
    sampleId: sample.id,
    title: sample.title,
    expected: sample.expected,
    verdict: parsed?.verdict ?? null,
    summary: parsed?.summary ?? null,
    reasons: kept,
    droppedReasons: dropped,
    shapeErrors: shape.errors,
    evidenceAllVerbatim: dropped.every((item) => !String(item.dropReason).includes("nguyen van")),
    okHasNoReasons,
    verdictMatches: verdictMatchesExpectation(sample, {
      verdict: parsed?.verdict,
      reasons: kept,
    }),
  };
}

/**
 * Entry point cua CLI.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.showHelp) {
    printHelp();
    return;
  }

  if (process.argv.includes("--list")) {
    for (const sample of SAMPLES) {
      console.log(`${sample.id}\n  ${sample.title}\n  Ky vong: ${sample.expected}`);
    }
    return;
  }

  const selectedSamples = options.sampleId
    ? SAMPLES.filter((sample) => sample.id === options.sampleId)
    : SAMPLES;

  if (selectedSamples.length === 0) {
    console.error(`Khong tim thay mau co id "${options.sampleId}". Dung --list de xem danh sach.`);
    process.exitCode = 1;
    return;
  }

  if (options.isDryRun) {
    console.log("=== DRY RUN — KHONG goi mang, KHONG dung khoa API ===\n");
    console.log("--- PHAN CHI DAN (INSTRUCTIONS) ---");
    console.log(INSTRUCTIONS);
    console.log("\n--- RESPONSE SCHEMA ---");
    console.log(JSON.stringify(RESPONSE_SCHEMA, null, 2));

    for (const sample of selectedSamples) {
      console.log(`\n--- PROMPT CHO MAU "${sample.id}" ---`);
      console.log(buildPrompt(buildJobContent(sample)));
    }

    console.log("\n--- HINH DANG KET QUA KY VONG ---");
    console.log(
      JSON.stringify(
        {
          verdict: "OK | WARN | SUSPECT",
          summary: "mot cau tom tat tieng Viet ngan gon",
          reasons: [
            {
              code: "[mot trong 6 ma da dinh nghia]",
              evidence: "cau nguyen van co trong tin",
              detail: "giai thich ngan tieng Viet",
            },
          ],
        },
        null,
        2,
      ),
    );
    console.log("\n=== HET DRY RUN ===");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error(
      [
        "Khong tim thay GEMINI_API_KEY trong bien moi truong.",
        "",
        "Cach chay that:",
        "  export GEMINI_API_KEY=<khoa-api-cua-ban>       # Git Bash / macOS / Linux",
        "  $env:GEMINI_API_KEY = '<khoa-api-cua-ban>'    # PowerShell",
        "",
        "Chay khong can khoa (in prompt + schema, khong goi mang):",
        "  node backend/scripts/ai-moderation/run.mjs --dry-run",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Model: ${options.model} | So mau se chay: ${selectedSamples.length}\n`);

  const report = {
    generatedAt: new Date().toISOString(),
    model: options.model,
    sampleCount: selectedSamples.length,
    results: [],
  };

  for (const sample of selectedSamples) {
    console.log(`Dang kiem duyet mau "${sample.id}" ...`);
    try {
      const result = await reviewSample(sample, apiKey, options.model);
      report.results.push(result);
      printSampleReport(sample, result);
    } catch (error) {
      // KHONG ghi khoa API ra log — chi ghi thong bao loi.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`LOI khi chay mau "${sample.id}": ${message}`);
      report.results.push({
        sampleId: sample.id,
        title: sample.title,
        expected: sample.expected,
        error: message,
        verdict: null,
        summary: null,
        reasons: [],
        droppedReasons: [],
        shapeErrors: [],
        evidenceAllVerbatim: false,
        okHasNoReasons: false,
        verdictMatches: false,
      });
    }
  }

  await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\nBao cao JSON da ghi tai: ${options.reportPath}`);

  const matched = report.results.filter((item) => item.verdictMatches).length;
  console.log(`Ket qua: ${matched}/${report.results.length} mau co verdict khop ky vong.`);
}

/**
 * Kiem tra module nay co duoc chay truc tiep khong (khong phai duoc `import`).
 *
 * Ly do can guard: file nay export nhieu ham thu nghiem (kiem tra bang chung
 * nguyen van, loc ly do) — muon viet script kiem chung nhanh ma khong phai
 * chay lai toan bo CLI va goi mang.
 *
 * @returns {boolean} True neu file dang duoc chay truc tiep.
 */
function isDirectInvocation() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectInvocation()) {
  await main();
}
