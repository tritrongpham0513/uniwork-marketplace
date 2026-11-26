#!/usr/bin/env node
/**
 * Cong cu danh gia TAY chat luong AI tren bo 7 mau tin tuyen dung (ticket 07).
 *
 * KHAC VOI `run.mjs` (ticket 01) o mot diem quan trong: cong tool nay chay
 * qua **DUONG CHAY THAT CUA UNG DUNG** — tuc la goi endpoint cua backend Spring
 * Boot:
 *
 *   POST /api/v1/employer/jobs              (tao tin — nha tuyen dung)
 *   POST /api/v1/admin/jobs/{id}/ai-review  (kiem tra AI — quan tri vien)
 *   GET  /api/v1/admin/jobs                 (doc ket qua DA LUU tren ban ghi)
 *   GET  /api/v1/employer/jobs               (kiem tra NTD khong thay ket qua AI)
 *
 * Dung chung `JobPost` / `AiProvider` / `AiPromptBuilder` / `AiEvidenceMatcher`
 * voi nhung luc nguoi dung bam nut "Kiem tra bang AI" trong trang Duyet tin.
 * Do do ket qua danh gia phan anh chinh xac nguoi dung se thay gi.
 *
 * Can co: backend Spring Boot chay (co MySQL) + `GEMINI_API_KEY` trong moi truong
 * backend + mot tai khoan ADMIN + mot tai khoan EMPLOYER.
 *
 * Cach dung:
 *   node backend/scripts/ai-moderation/evaluate.mjs --help
 *   node backend/scripts/ai-moderation/evaluate.mjs --plan
 *   node backend/scripts/ai-moderation/evaluate.mjs --live \
 *        --base-url http://localhost:8080/api/v1 \
 *        --admin admin@viejob.vn --admin-password 'Admin@123' \
 *        --employer employer@viejob.vn --employer-password 'Employer@123' \
 *        --report .scratch/ai-moderation/notes/07-bao-cao-danh-gia.json
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { SAMPLES } from "./samples.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(SCRIPT_DIR, "..", "..", "..");
const DEFAULT_REPORT_PATH = path.join(
  REPO_DIR,
  ".scratch",
  "ai-moderation",
  "notes",
  "07-bao-cao-danh-gia.json",
);

/** Ma vi pham hop le — khop voi 6 ma co dinh trong `CONTRACT.md` muc 1. */
export const VIOLATION_CODES = Object.freeze([
  "FEE_ADVANCE",
  "UNREGISTERED_WORK",
  "OFF_PLATFORM",
  "SALARY_ANOMALY",
  "DISCRIMINATION",
  "ILLEGAL_WORK",
]);

/**
 * Buoc chay qua duong chay THAT cua ung dung cho tung mau.
 *
 * <p>Moi buoc mo ta cach dua mau vao he thong va lay ket qua nhan duoc — khong
 * phai mo ta cach goi Gemini truc tiep.
 */
const STEPS = [
  {
    order: 1,
    title: "Tao tin tuyen dung trong DB",
    detail:
      "Nha tuyen dung goi POST /api/v1/employer/jobs. Tin duoc luu voi " +
      "status = 'PENDING_REVIEW' va co slug (public id) de goi lai endpoint kiem tra.",
  },
  {
    order: 2,
    title: "Gan nhom viec + tinh va bang xep hang luong",
    detail:
      "Chon category + province sao cho co dong trong bang xep hang luong dung " +
      "nhom viec x tinh. Khong co dong -> tin van kiem duyet duoc, nhung thieu can " +
      "cu so sanh luong (xac nhan yeu cau 'khong co bang xep hang luong thi van " +
      "kiem duyet duoc').",
  },
  {
    order: 3,
    title: "Dang nhap quan tri vien",
    detail:
      "Lay token cua tai khoan ADMIN (POST /api/v1/auth/login). Token nay dung " +
      "cho ca buoc goi endpoint kiem tra AI.",
  },
  {
    order: 4,
    title: "Goi POST /api/v1/admin/jobs/{id}/ai-review",
    detail:
      "Goi endpoint kiem tra thu cong. Day la CUNG duong chay ma nhan tuyen dung " +
      "se cham khi bam nut 'Kiem tra bang AI'.",
  },
  {
    order: 5,
    title: "Doc ket qua da luu tren ban ghi tin",
    detail:
      "Doc lai GET /api/v1/admin/jobs va lay aiVerdict / aiReasons / aiCheckedAt. " +
      "Ket qua phai DA DUOC LUU — khong chi nam trong response. Do la cach " +
      "chung minh tinh nang 'luu ngay tren ban ghi tin tuyen dung' hoat dong.",
  },
  {
    order: 6,
    title: "Kiem tra tin khong doi trang thai",
    detail:
      "status cua tin phai van la 'PENDING_REVIEW' sau khi kiem tra. AI khong " +
      "bao gio duoc tu chuyen trang thai.",
  },
  {
    order: 7,
    title: "Kiem tra nha tuyen dung khong thay ket qua",
    detail:
      "Goi GET /api/v1/employer/jobs bang token cua nha tuyen dung va xac nhan " +
      "JSON khong co aiVerdict / aiReasons / aiCheckedAt.",
  },
  {
    order: 8,
    title: "Doi chieu tay",
    detail:
      "So verdict + ma vi pham nhan duoc voi expected cua mau. Moi evidence phai " +
      "la cau nguyen van co that trong noi dung tin. Verdict OK thi reasons rong.",
  },
];

/**
 * Kiem tra verdict co khop voi ky vong cua mau khong.
 *
 * @param {object} sample Mau tin tuyen dung.
 * @param {object} result Ket qua nhan duoc.
 * @returns {boolean} True neu khop.
 */
export function verdictMatchesExpectation(sample, result) {
  const expected = String(sample.expected ?? "");
  const acceptedVerdicts = [];
  if (expected.includes("SUSPECT")) acceptedVerdicts.push("SUSPECT");
  if (expected.includes("WARN")) acceptedVerdicts.push("WARN");
  if (expected.startsWith("OK")) acceptedVerdicts.push("OK");
  if (acceptedVerdicts.length === 0) return false;
  if (!acceptedVerdicts.includes(result.verdict)) return false;

  const codes = VIOLATION_CODES.filter((code) => expected.includes(code));
  if (codes.length === 0) return true;

  const actualCodes = new Set((result.reasons ?? []).map((reason) => reason.code));
  return codes.every((code) => actualCodes.has(code));
}

/**
 * Chuan hoa chuoi de so khop "nguyen van" ma khong so voi khac biet viet hoa.
 *
 * <p>Khớp quy tac cua `AiEvidenceMatcher` o backend: NFC -> gop khoang trang ->
 * khong phan biet hoa thuong.
 *
 * @param {string} value Chuoi can chuan hoa.
 * @returns {string} Chuoi da chuan hoa.
 */
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Kiem tra evidence co that su xuat hien trong noi dung tin khong.
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
 * Tao bang mau rong cho bao cao.
 *
 * @param {object} sample Mau tin tuyen dung.
 * @returns {object} Ket qua cho mau do.
 */
export function emptyResultFor(sample) {
  return {
    sampleId: sample.id,
    title: sample.title,
    expected: sample.expected,
    jobId: null,
    verdict: null,
    summary: null,
    reasons: [],
    aiCheckedAt: null,
    statusAfterReview: null,
    employerSeesAiFields: null,
    verdictMatches: false,
    evidenceAllVerbatim: null,
    okHasNoReasons: null,
    notes: [],
  };
}

/**
 * In ke hoach chay.
 *
 * @returns {void}
 */
function printPlan() {
  const lines = [];
  lines.push("=".repeat(78));
  lines.push("KE HOACH DANH GIA TAY — 7 MAU TIN TUYEN DUNG (ticket 07)");
  lines.push("=".repeat(78));
  lines.push("");
  lines.push("Cong tool nay KHONG goi Gemini truc tiep. No chay qua DUONG CHAY");
  lines.push("THAT CUA UNG DUNG (endpoint kiem tra AI cua quan tri vien), de ket qua");
  lines.push("danh gia phan anh chinh xac nguoi dung se thay gi.");
  lines.push("");
  lines.push("DIEU KIEN CAN CO:");
  lines.push("  1. Backend Spring Boot chay (co MySQL) + migration V15 da apply.");
  lines.push("  2. GEMINI_API_KEY trong moi truong backend + AI_ENABLED=true.");
  lines.push("  3. Tai khoan ADMIN va tai khoan EMPLOYER.");
  lines.push("");
  lines.push("CAC BUOC:");
  for (const step of STEPS) {
    lines.push("");
    lines.push(`  [${step.order}] ${step.title}`);
    lines.push(`      ${step.detail}`);
  }
  lines.push("");
  lines.push("BANG MAU (ky vong thiết kế — KHONG phai ket quan chay thật):");
  lines.push("");
  lines.push("  #   id                          Ky vong");
  for (const sample of SAMPLES) {
    lines.push(`  ${String(sample.id).padEnd(28)} ${sample.expected}`);
  }
  lines.push("");
  lines.push("TIE CHI NGHIEM THU (spec.md):");
  lines.push("  - Verdict dung voi ky vong o it nhat 6/7 mau.");
  lines.push("  - Moi evidence la cau nguyen van co that trong tin.");
  lines.push("  - Verdict OK -> reasons rong.");
  lines.push("  - Tin khong bi doi trang thai.");
  lines.push("  - Nha tuyen dung dang tin vi pham van khong bi chan.");
  lines.push("  - Mo phong loi AI -> giao dien hien 'Chua kiem tra', khong phai loi ky thuat.");
  lines.push("");
  lines.push("=".repeat(78));
  console.log(lines.join("\n"));
}

/**
 * Goi API va tra ve phan `data` cua wrapper ApiResponse.
 *
 * @param {string} baseUrl Goc cua API (vd http://localhost:8080/api/v1).
 * @param {string} method HTTP method.
 * @param {string} endpoint Duong dan (bat dau bang `/`).
 * @param {object|null} body Payload (neu co).
 * @param {string|null} token Bearer token (neu can).
 * @returns {Promise<{ status: number, data: any }>}.
 */
async function callApi(baseUrl, method, endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = { raw };
  }

  if (!response.ok) {
    const message = payload?.message ?? raw.slice(0, 300);
    throw new Error(`${method} ${endpoint} -> HTTP ${response.status}: ${message}`);
  }

  return { status: response.status, data: payload?.data ?? payload };
}

/**
 * Dang nhap va lay access token.
 *
 * @param {string} baseUrl Goc cua API.
 * @param {string} email Email.
 * @param {string} password Mat khau.
 * @returns {Promise<string>} Access token.
 */
async function login(baseUrl, email, password) {
  const { data } = await callApi(baseUrl, "POST", "/auth/login", { email, password }, null);
  if (!data?.accessToken) {
    throw new Error(`Dang nhap that bai: khong nhan duoc accessToken cho ${email}`);
  }
  return data.accessToken;
}

/**
 * Lay danh sach nhom viec cong khai de gan cho tin mau.
 *
 * @param {string} baseUrl Goc cua API.
 * @returns {Promise<Array>} Danh sach nhom viec.
 */
async function listCategories(baseUrl) {
  const { data } = await callApi(baseUrl, "GET", "/public/categories", null, null);
  return Array.isArray(data) ? data : [];
}

/**
 * Ban do mau -> nhom viec trong he thong.
 *
 * <p>Ten nhom viec trong mau (viet theo ngon ngu con nguoi) khong trung khop
 * ten nhom viec cua he thong, nen ta gan tay theo ma. Dong nay la **du lieu
 * dau vao** cua bai danh gia, dung de dinh nghia mau duoc kiem tra trong boi
 * canh nao — va de nguoi doc doi chieu lai duoc.
 *
 * <p>Mau khong co dong tuong ung (vi du su kien / qua an ninh) se duoc gan
 * `cat-fnb` — nhom viec pho bien nhat — va ghi chu lai trong bao cao.
 */
const SAMPLE_CATEGORY_IDS = Object.freeze({
  "mau-01-dat-coc": "cat-fnb",
  "mau-02-khong-can-cccd": "cat-giao-hang",
  "mau-03-tuyen-qua-zalo": "cat-fnb",
  "mau-04-chi-nam-duoi-20-tui": "cat-ban-tang",
  "mau-05-lien-quan-mai-dam": "cat-fnb",
  "mau-06-luong-anh": "cat-fnb",
  "mau-07-tin-binh-thuong": "cat-fnb",
});

/**
 * Chon nhom viec phu hop voi tung mau.
 *
 * <p>Uu tien ma gan tay trong {@link SAMPLE_CATEGORY_IDS}; neu khong co thi
 * dung tu khoa trong ten mau de doan, va ghi lai de nguoi doc doi chieu.
 *
 * @param {Array} categories Danh sach nhom viec tu API.
 * @param {object} sample Mau tin tuyen dung.
 * @returns {{ category: object|null, source: string }} Nhom viec da chon + cach chon.
 */
export function pickCategory(categories, sample) {
  const explicitId = SAMPLE_CATEGORY_IDS[sample.id];
  if (explicitId) {
    const match = categories.find((category) => category.id === explicitId);
    if (match) return { category: match, source: "gan tay theo ma" };
  }

  const keyword = String(sample.category ?? "").toLowerCase();
  const keywordParts = keyword.split(/[\s-,]+/).filter((part) => part.length > 2);

  const scored = categories.map((category) => {
    const haystack = `${category.name ?? ""} ${category.slug ?? ""}`.toLowerCase();
    let score = 0;
    for (const part of keywordParts) {
      if (haystack.includes(part)) score += 1;
    }
    return { category, score };
  });

  scored.sort((a, b) => b.score - a.score);
  if (scored[0]?.score > 0) {
    return { category: scored[0].category, source: "doan theo tu khoa" };
  }
  return { category: null, source: "khong gan duoc" };
}

/**
 * Tao payload dang tin tuyen dung tu mau.
 *
 * @param {object} sample Mau tin tuyen dung.
 * @param {object|null} category Nhom viec da chon.
 * @returns {object} Payload cho POST /employer/jobs.
 */
export function buildJobPayload(sample, category) {
  return {
    title: sample.title,
    description: sample.description,
    requirements: sample.requirements,
    benefits: sample.benefits,
    category: category
      ? { id: category.id, name: category.name }
      : null,
    position: null,
    employmentType: "PART_TIME",
    workMode: "ONSITE",
    salaryType: sample.salaryType,
    salaryMin: sample.salaryMin,
    salaryMax: sample.salaryMax,
    location: {
      provinceId: "79",
      province: "Hồ Chí Minh",
      district: null,
      ward: null,
      address: sample.location,
      branchName: null,
    },
    positionsCount: 1,
    positionsFilled: 0,
    schedules: [],
    skills: [],
    deadline: null,
  };
}

/**
 * Dung lai noi dung tin theo **dung** dinh dang backend dung.
 *
 * <p>Phai khop byte-for-byte voi `JobContentAssembler.assemble` cua backend,
 * neu khong thi bang chung ma backend giu lai co the khong khop voi noi dung
 * ta dung de doi chieu tay — va ta se bao "khong nguyen van" oi.
 *
 * <p>Vi du kiem chung: backend ghi `Mo ta: <mo ta>` tren mot dong (khong phai
 * `Mo ta:` roi xuong dong), va cac khoi nghiep vu (muc luong, bang xep hang
 * luong, uy tin nha tuyen dung) cung nam trong noi dung do — nen bang chung AI
 * trich dan tu cac khoi do van la "nguyen van" theo dung quy tac backend.
 *
 * @param {object} sample Mau tin tuyen dung.
 * @param {object} context Du lieu nghiep vu he thong cung cap.
 * @returns {string} Noi dung tin dang van ban.
 */
export function buildJobContent(sample, context = {}) {
  const { salaryLine = null, benchmarkLine = null, trustLine = null } = context;

  const lines = [];
  lines.push(`Tieu de: ${sample.title}`);
  lines.push(`Mo ta: ${sample.description}`);
  lines.push("Yeu cau:");
  for (const requirement of sample.requirements) {
    lines.push(`  - ${requirement}`);
  }
  lines.push("Quyen loi:");
  for (const benefit of sample.benefits) {
    lines.push(`  - ${benefit}`);
  }
  lines.push("Hinh thuc lam viec: ONSITE");
  lines.push("Loai hinh lam viec: PART_TIME");
  lines.push("So suat: 1 nguoi");
  if (salaryLine) lines.push(salaryLine);
  if (benchmarkLine) lines.push(benchmarkLine);
  if (trustLine) lines.push(trustLine);

  return lines.join("\n");
}

/**
 * Dung dong muc luong y het dinh dang backend.
 *
 * @param {object} sample Mau tin tuyen dung.
 * @returns {string} Dong muc luong.
 */
export function buildSalaryLine(sample) {
  const hoursPerUnit = { HOURLY: 1, DAILY: 8, WEEKLY: 40, MONTHLY: 160 };
  const hours = hoursPerUnit[sample.salaryType];

  let line = `Muc luong: ${sample.salaryType}, tu ${sample.salaryMin} den ${sample.salaryMax} VND`;
  if (hours) {
    const hourlyMin = Math.round(sample.salaryMin / hours);
    const hourlyMax = Math.round(sample.salaryMax / hours);
    line += ` (quy doi ${hourlyMin} - ${hourlyMax} VND/gio)`;
  } else {
    line += " (khong quy doi duoc sang VND/gio)";
  }
  return line;
}

/**
 * Dung dong bang xep hang luong y het dinh dang backend.
 *
 * @param {object|null} benchmark Dong xep hang luong tu he thong.
 * @returns {string|null} Dong bang xep hang luong.
 */
export function buildBenchmarkLine(benchmark) {
  if (!benchmark) return null;
  return (
    `Xep hang luong nhom viec "${benchmark.categoryName}" tai ${benchmark.provinceName}: ` +
    `trung binh ${benchmark.avgHourly} VND/gio, thap nhat ${benchmark.minHourly}, ` +
    `cao nhat ${benchmark.maxHourly}, co mau ${benchmark.sampleSize} tin`
  );
}

/**
 * Dung dong uy tin nha tuyen dung y het dinh dang backend.
 *
 * @param {object} employer Thong tin uy tin.
 * @returns {string} Dong uy tin.
 */
export function buildTrustLine(employer) {
  const avg = employer.avgRating === null || employer.avgRating === undefined
    ? "chua co danh gia"
    : employer.avgRating;
  return (
    `Uy tin nha tuyen dung: ${employer.isVerified ? "da xac minh" : "chua xac minh"}, ` +
    `diem uy tin trung binh ${avg}/5 tren ${employer.ratingCount ?? 0} danh gia`
  );
}

/**
 * Goi endpoint kiem tra AI, thu lai khi gap loi tam thoi.
 *
 * <p>Nha cung cap AI thuong tra loi 503 khi tai dap trung — day la loi *tam thoi*,
 * khong phai loi cua ung dung. Bai danh gia do loi mang tinh chat may (Model
 * Availability) thi thu lai van cho ket qua dung, nen ta thu lai co gioi han.
 *
 * @param {string} baseUrl Goc cua API.
 * @param {string} jobId Id tin tuyen dung.
 * @param {string} token Token quan tri vien.
 * @param {number} maxRetries So lan thu lai toi da.
 * @param {number} delayMs Cho giua cac lan thu.
 * @returns {Promise<{ data: any, error: string|null, retries: number }>}.
 */
async function reviewWithRetry(baseUrl, jobId, token, maxRetries, delayMs) {
  let retries = 0;
  let lastError = null;

  while (retries <= maxRetries) {
    try {
      const { data } = await callApi(
        baseUrl,
        "POST",
        `/admin/jobs/${jobId}/ai-review`,
        null,
        token,
      );
      return { data, error: null, retries };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      retries += 1;
      if (retries > maxRetries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * retries));
    }
  }

  return { data: null, error: lastError, retries };
}

/**
 * Lay bang xep hang luong cong khai tu he thong.
 *
 * @param {string} baseUrl Goc cua API.
 * @returns {Promise<Array>} Danh sach dong xep hang luong.
 */
async function listBenchmarks(baseUrl) {
  const { data } = await callApi(baseUrl, "GET", "/public/salary-benchmarks", null, null);
  return Array.isArray(data) ? data : [];
}

/**
 * Chon dong xep hang luong cho nhom viec + tinh cua tin.
 *
 * <p>Backend dung quy tac: uu tien dung tinh cua tin, neu tinh do khong co dong
 * thi lui ve tinh mac dinh ("79" — Hồ Chí Minh). Script dung **cung** quy tac de
 * dung lai noi dung tin cho dung bang chung.
 *
 * @param {Array} benchmarks Danh sach dong xep hang luong.
 * @param {string} categoryId Ma nhom viec.
 * @param {string} provinceId Ma tinh.
 * @returns {object|null} Dong xep hang luong da chon.
 */
export function pickBenchmark(benchmarks, categoryId, provinceId) {
  const FALLBACK_PROVINCE = "79";
  let fallback = null;

  for (const row of benchmarks) {
    if (row.categoryId !== categoryId) continue;
    if (row.provinceId === provinceId) return row;
    if (row.provinceId === FALLBACK_PROVINCE && !fallback) fallback = row;
  }
  return fallback;
}

/**
 * Cap nhat ho so nha tuyen dung cho khop voi mau dang danh gia.
 *
 * <p>Moi mau co mot bo uy tin rieng (da xac minh / diem uy tin / so danh gia).
 * Backend doc uy tin tu ho so nha tuyen dung that, nen neu khong cap nhat thi
 * moi mau deu nhan cung mot bo uy tin — va bai danh gia se khong phan anh
 * dung thong tin dau vao ma mau mo ta.
 *
 * @param {string} baseUrl Goc cua API.
 * @param {string} token Token nha tuyen dung.
 * @param {object} sample Mau tin tuyen dung.
 * @returns {Promise<void>}
 */
async function syncEmployerProfile(baseUrl, token, sample) {
  const employer = sample.employer ?? {};
  await callApi(baseUrl, "PUT", "/employer/profile", {
    employerType: "COMPANY",
    displayName: employer.name ?? "Nhà tuyển dụng đánh giá",
    contactName: "Người liên hệ",
    contactPhone: "0900000000",
    taxCode: null,
    description: `Tài khoản dùng cho bài đánh giá tay chất lượng AI (mẫu ${sample.id}).`,
    logoUrl: null,
    logoVariant: null,
    website: null,
    provinceId: "79",
    address: sample.location,
  }, token);
}

/**
 * Chay danh gia song song voi backend that.
 *
 * @param {object} options Cau hinh.
 * @returns {Promise<object>} Bao cao.
 */
async function runLive(options) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const notes = [];

  notes.push("Dang lay danh sach nhom viec cong khai...");
  const categories = await listCategories(baseUrl);
  if (categories.length === 0) {
    throw new Error("Khong lay duoc danh sach nhom viec tu backend.");
  }

  notes.push("Dang dang nhap quan tri vien...");
  const adminToken = await login(baseUrl, options.admin, options.adminPassword);
  notes.push("Dang dang nhap nha tuyen dung...");
  const employerToken = await login(baseUrl, options.employer, options.employerPassword);

  notes.push("Dang lay bang xep hang luong...");
  const benchmarks = await listBenchmarks(baseUrl);
  const provinceNames = new Map();
  {
    const { data: provinces } = await callApi(baseUrl, "GET", "/public/provinces", null, null);
    for (const province of provinces ?? []) {
      provinceNames.set(province.id, province.name);
    }
  }

  const results = [];

  for (const sample of SAMPLES) {
    const row = emptyResultFor(sample);
    results.push(row);
    const sampleNotes = [];

    try {
      // --- Buoc 0: ho so nha tuyen dung khop voi mau ---
      await syncEmployerProfile(baseUrl, employerToken, sample);

      // --- Buoc 1: tao tin tuyen dung (nha tuyen dung) ---
      const { category, source } = pickCategory(categories, sample);
      if (category) {
        sampleNotes.push(`Nhom viec da gan (${source}): ${category.name} (${category.id}).`);
      } else {
        sampleNotes.push("Khong gan duoc nhom viec — tin van duoc tao, AI chi thieu can cu so sanh luong.");
      }

      const { data: created } = await callApi(
        baseUrl,
        "POST",
        "/employer/jobs",
        buildJobPayload(sample, category),
        employerToken,
      );
      const jobId = created?.id;
      row.jobId = jobId ?? null;
      if (!jobId) {
        throw new Error("Tao tin thanh cong nhung khong nhan duoc id.");
      }

      // --- Buoc 2: cho luat chay AI o nen (ticket 04) xong ---
      // Endpoint thu cong van chay lai, nen khong can doi — nhung ta ghi nhan
      // de biet tin co duoc danh dau "chua kiem tra" truoc do khong.
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // --- Buoc 3: goi endpoint kiem tra AI (cung duong chay voi nguoi dung) ---
      const review = await reviewWithRetry(
        baseUrl,
        jobId,
        adminToken,
        options.retryCount,
        options.retryDelayMs,
      );
      if (review.error) {
        throw new Error(review.error);
      }

      row.verdict = review.data?.verdict ?? null;
      row.summary = review.data?.summary ?? null;
      row.reasons = Array.isArray(review.data?.reasons) ? review.data.reasons : [];
      row.aiCheckedAt = review.data?.aiCheckedAt ?? null;
      if (review.retries > 0) {
        sampleNotes.push(
          `Endpoint kiem tra AI that bai ${review.retries} lan truoc do (503 tam thoi tu nha cung cap AI) — thu lai thanh cong.`,
        );
      }

      // --- Buoc 4: doc ket qua DA LUU tren ban ghi tin ---
      const { data: adminJobs } = await callApi(
        baseUrl,
        "GET",
        "/admin/jobs",
        null,
        adminToken,
      );
      const persisted = (adminJobs ?? []).find((job) => job.id === jobId);
      if (!persisted) {
        sampleNotes.push("KHONG tim thay tin trong GET /admin/jobs sau khi kiem tra.");
      } else {
        row.statusAfterReview = persisted.status ?? null;
        row.aiCheckedAt = persisted.aiCheckedAt ?? row.aiCheckedAt;
        const persistedVerdict = persisted.aiVerdict ?? null;
        if (persistedVerdict !== row.verdict) {
          sampleNotes.push(
            `Verdict tren ban ghi (${persistedVerdict}) KHAC verdict trong response (${row.verdict}).`,
          );
        }
        if (persisted.status !== "PENDING_REVIEW") {
          sampleNotes.push(
            `SAI: trang thai tin thay doi thanh "${persisted.status}" — AI khong duoc doi trang thai.`,
          );
        } else {
          sampleNotes.push("Trang thai tin van la PENDING_REVIEW sau khi kiem tra.");
        }
      }

      // --- Buoc 5: nha tuyen dung khong thay ket qua AI ---
      const { data: employerJobs } = await callApi(
        baseUrl,
        "GET",
        "/employer/jobs",
        null,
        employerToken,
      );
      const employerJob = (employerJobs ?? []).find((job) => job.id === jobId);
      if (!employerJob) {
        row.employerSeesAiFields = null;
        sampleNotes.push("KHONG tim thay tin trong GET /employer/jobs.");
      } else {
        const leaked = ["aiVerdict", "aiReasons", "aiCheckedAt"].filter(
          (key) => key in employerJob,
        );
        row.employerSeesAiFields = leaked.length === 0;
        sampleNotes.push(
          leaked.length === 0
            ? "Nha tuyen dung khong thay truong AI nao."
            : `SAI: nha tuyen dung thay ${leaked.join(", ")}.`,
        );
      }

      // --- Buoc 6: doi chieu tay ---
      const benchmark = category ? pickBenchmark(benchmarks, category.id, "79") : null;
      const jobContent = buildJobContent(sample, {
        salaryLine: buildSalaryLine(sample),
        benchmarkLine: buildBenchmarkLine(
          benchmark
            ? {
                ...benchmark,
                categoryName: category.name,
                provinceName: provinceNames.get(benchmark.provinceId) ?? null,
              }
            : null,
        ),
        trustLine: buildTrustLine(sample.employer),
      });

      row.evidenceAllVerbatim = row.reasons.every((reason) =>
        isEvidenceVerbatim(reason.evidence, jobContent),
      );
      row.okHasNoReasons = row.verdict !== "OK" || row.reasons.length === 0;
      row.verdictMatches = verdictMatchesExpectation(sample, row);

      for (const reason of row.reasons) {
        if (!isEvidenceVerbatim(reason.evidence, jobContent)) {
          sampleNotes.push(
            `Bang chung KHONG nguyen van cho ma ${reason.code}: "${reason.evidence}".`,
          );
        }
      }
      if (row.verdict === "OK" && row.reasons.length > 0) {
        sampleNotes.push("SAI: verdict OK nhung van co ly do.");
      }
    } catch (error) {
      row.notes = [error instanceof Error ? error.message : String(error)];
      row.verdictMatches = false;
    }

    row.notes = [...row.notes, ...sampleNotes];
  }

  const matched = results.filter((row) => row.verdictMatches).length;
  const allVerbatim = results.every((row) => row.evidenceAllVerbatim !== false);
  const okEmpty = results.every((row) => row.okHasNoReasons !== false);
  const statusUnchanged = results.every(
    (row) => row.statusAfterReview === null || row.statusAfterReview === "PENDING_REVIEW",
  );
  const noLeak = results.every((row) => row.employerSeesAiFields !== false);

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    notes,
    acceptanceCriteria: {
      verdictMatchAtLeast: "6/7",
      verdictMatched: `${matched}/${results.length}`,
      allEvidenceVerbatim: allVerbatim,
      okHasNoReasons: okEmpty,
      jobStatusUnchanged: statusUnchanged,
      employerNeverSeesAiFields: noLeak,
      aiFailureShowsNotChecked: null,
    },
    results,
  };
}

/**
 * Ghi bo mau ra file de nguoi thu muc dien du lieu khi co khoa API.
 *
 * @param {string} reportPath Duong dan file bao cao.
 * @returns {Promise<void>}
 */
async function writeTemplate(reportPath) {
  const report = {
    generatedAt: new Date().toISOString(),
    note:
      "Bao cao nay CHUA co ket qua chay thay. Khi co GEMINI_API_KEY, chay qua " +
      "duong chay that cua ung dung va dien ket qua vao tung mau.",
    acceptanceCriteria: {
      verdictMatchAtLeast: "6/7",
      allEvidenceVerbatim: true,
      okHasNoReasons: true,
      jobStatusUnchanged: true,
      violatingJobNotBlocked: true,
      aiFailureShowsNotChecked: true,
    },
    results: SAMPLES.map(emptyResultFor),
  };

  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Bao cao mau da ghi tai: ${reportPath}`);
}

/**
 * Phan tich CLI.
 *
 * @param {string[]} argv Danh sach tham so.
 * @returns {object} Cau hinh.
 */
export function parseArgs(argv) {
  const options = {
    showPlan: false,
    showHelp: false,
    isLive: false,
    reportPath: DEFAULT_REPORT_PATH,
    baseUrl: process.env.AI_EVAL_BASE_URL ?? "http://localhost:8080/api/v1",
    admin: process.env.AI_EVAL_ADMIN ?? "admin@viejob.vn",
    adminPassword: process.env.AI_EVAL_ADMIN_PASSWORD ?? "Admin@123",
    employer: process.env.AI_EVAL_EMPLOYER ?? "employer@viejob.vn",
    employerPassword: process.env.AI_EVAL_EMPLOYER_PASSWORD ?? "Employer@123",
    retryCount: 3,
    retryDelayMs: 3000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === "--plan") {
      options.showPlan = true;
    } else if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    } else if (arg === "--live") {
      options.isLive = true;
    } else if (arg === "--base-url") {
      options.baseUrl = next();
    } else if (arg === "--admin") {
      options.admin = next();
    } else if (arg === "--admin-password") {
      options.adminPassword = next();
    } else if (arg === "--employer") {
      options.employer = next();
    } else if (arg === "--employer-password") {
      options.employerPassword = next();
    } else if (arg === "--report") {
      options.reportPath = path.resolve(next());
    } else if (arg.startsWith("--report=")) {
      options.reportPath = path.resolve(arg.slice("--report=".length));
    } else if (arg.startsWith("--base-url=")) {
      options.baseUrl = arg.slice("--base-url=".length);
    } else if (arg === "--retry") {
      options.retryCount = Number(next());
    } else if (arg === "--retry-delay") {
      options.retryDelayMs = Number(next());
    }
  }
  return options;
}

/**
 * Entry point cua CLI.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.showHelp) {
    console.log(
      [
        "Cong cu danh gia TAY chat luong AI tren 7 mau tin tuyen dung (ticket 07).",
        "",
        "Dung:",
        "  node backend/scripts/ai-moderation/evaluate.mjs --plan",
        "  node backend/scripts/ai-moderation/evaluate.mjs --live [tuy chon]",
        "",
        "Tuy chon:",
        "  --plan                 In ke hoach chay qua duong chay THAT cua ung dung.",
        "  --live                 Chay that: tao tin -> kiem tra AI -> doc ket qua da luu.",
        "  --base-url <url>       Goc API (mac dinh: http://localhost:8080/api/v1).",
        "  --admin <email>        Email quan tri vien.",
        "  --admin-password <pw>  Mat khau quan tri vien.",
        "  --employer <email>     Email nha tuyen dung.",
        "  --employer-password <pw> Mat khau nha tuyen dung.",
        "  --report <duong dan>   File bao cao JSON.",
        "",
        "Bien moi truong:",
        "  AI_EVAL_BASE_URL, AI_EVAL_ADMIN, AI_EVAL_ADMIN_PASSWORD,",
        "  AI_EVAL_EMPLOYER, AI_EVAL_EMPLOYER_PASSWORD",
      ].join("\n"),
    );
    return;
  }

  if (options.showPlan) {
    printPlan();
    return;
  }

  if (options.isLive) {
    const report = await runLive(options);
    await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`\nBao cao JSON da ghi tai: ${options.reportPath}`);
    for (const note of report.notes) {
      console.log(`  - ${note}`);
    }
    console.log("");
    for (const row of report.results) {
      console.log(
        `${row.verdictMatches ? "KOP" : "KHONG KOP"}  ${row.sampleId.padEnd(26)} ` +
          `verdict=${String(row.verdict).padEnd(8)} expected=${row.expected}`,
      );
      for (const note of row.notes) {
        console.log(`        ${note}`);
      }
    }
    console.log("");
    console.log(
      `Ket qua: ${report.acceptanceCriteria.verdictMatched} mau co verdict khop ky vong.`,
    );
    return;
  }

  await writeTemplate(options.reportPath);
}

/**
 * Kiem tra module nay co duoc chay truc tiep khong (khong phai duoc `import`).
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
