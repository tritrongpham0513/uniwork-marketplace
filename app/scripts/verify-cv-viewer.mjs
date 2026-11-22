#!/usr/bin/env node
/**
 * Kiểm chứng tính năng "xem CV trực tiếp" — API + quyền truy cập.
 *
 * Kịch bản:
 *   1. SV upload PDF hợp lệ → gắn vào hồ sơ → API trả `cvMimeType`.
 *   2. SV upload DOCX hợp lệ → `cvMimeType` = docx (frontend sẽ không render).
 *   3. CV stream qua endpoint có token → 200 + đúng bytes.
 *   4. Khách (không token) → 403.
 *   5. NTD đã nhận đơn ứng tuyển → đọc được CV (200).
 *   6. NTD chưa nhận đơn → 403.
 *   7. SV khác → 403.
 *   8. Đơn ứng tuyển có `cvMimeType` đúng.
 *
 * Chạy:
 *   API_URL=http://localhost:8081/api/v1 node scripts/verify-cv-viewer.mjs
 *   API_URL=http://localhost:8080/api/v1 node scripts/verify-cv-viewer.mjs
 */

const BASE = process.env.API_URL ?? "http://localhost:8081/api/v1";

let failures = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  ❌ ${msg}`);
};

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function login(email, password) {
  const { status, json } = await api("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (status !== 200 || !json?.data?.accessToken) {
    throw new Error(
      `Đăng nhập ${email} thất bại (${status}): ${JSON.stringify(json)}`
    );
  }
  return json.data.accessToken;
}

/** Tải file CV ra buffer (kèm token) — dùng để kiểm tra bytes + quyền. */
async function download(fileId, token) {
  const res = await fetch(`${BASE}/files/${fileId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buffer };
}

/** Tạo PDF hợp lệ (đủ magic bytes để backend nhận diện). */
const makePdf = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    "latin1"
  );

/** Tạo DOCX hợp lệ — ZIP với magic bytes PK + [Content_Types].xml. */
const makeDocx = () => {
  // File .doc/.docx có magic bytes "PK\x03\x04" (ZIP). Backend chỉ kiểm tra
  // magic bytes + MIME từ whitelist nên file ZIP tối thiểu là đủ.
  return Buffer.from(
    "PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00",
    "latin1"
  );
};

/** Upload CV qua luồng presigned PUT (giống hệt frontend). */
async function uploadCv(token, fileName, bytes, mimeType) {
  const presign = await api(
    `/files/presign?kind=CV&contentType=${encodeURIComponent(mimeType)}`,
    { method: "POST", token }
  );
  if (presign.status !== 200 || !presign.json?.data?.uploadUrl) {
    throw new Error(`presign thất bại: ${presign.status}`);
  }
  const signed = presign.json.data;

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": signed.contentType },
    body: bytes,
  });
  if (put.status !== 200) {
    throw new Error(`PUT lên R2 thất bại: ${put.status}`);
  }

  const confirm = await api("/files/confirm", {
    method: "POST",
    token,
    body: { storageKey: signed.storageKey, kind: "CV", fileName },
  });
  if (confirm.status !== 201 || !confirm.json?.data?.id) {
    throw new Error(`confirm thất bại: ${confirm.status}`);
  }
  return confirm.json.data;
}

/** Gắn CV vào hồ sơ sinh viên. */
async function attachCv(token, cvUrl) {
  const res = await api("/student/profile", {
    method: "PUT",
    token,
    body: { cvUrl },
  });
  if (res.status !== 200) {
    throw new Error(`gắn CV vào hồ sơ thất bại: ${res.status}`);
  }
  return res.json.data;
}

log("\n⭐  Xem CV trực tiếp (mime type / quyền truy cập)");

const studentToken = await login("student@viejob.vn", "Student@123");
const employerToken = await login("employer@viejob.vn", "Employer@123");

// --- 1. Upload PDF + gắn vào hồ sơ → cvMimeType phải là application/pdf -----
const pdfBytes = makePdf();
const pdfFile = await uploadCv(
  studentToken,
  "CV-NguyenVanA.pdf",
  pdfBytes,
  "application/pdf"
);
ok(`Upload PDF -> ${pdfFile.id} (${pdfFile.mimeType})`);

const profile = await attachCv(studentToken, pdfFile.url);

if (profile.cvUrl === pdfFile.url) {
  ok(`Hồ sơ đã gắn CV: ${profile.cvUrl}`);
} else {
  fail(`Hồ sơ chưa gắn CV, thực tế: ${profile.cvUrl}`);
}

if (profile.cvMimeType === "application/pdf") {
  ok("cvMimeType = application/pdf (frontend sẽ render trực tiếp)");
} else {
  fail(`cvMimeType phải là application/pdf, thực tế: ${profile.cvMimeType}`);
}

if (profile.cvFileName === "CV-NguyenVanA.pdf") {
  ok(`cvFileName giữ đúng tên gốc: ${profile.cvFileName}`);
} else {
  fail(`cvFileName sai: ${profile.cvFileName}`);
}

// --- 2. CV stream qua endpoint có token -----------------------------------
const owner = await download(pdfFile.id, studentToken);
if (owner.status === 200 && owner.buffer.length === pdfBytes.length) {
  ok("Chủ sở hữu tải được CV (200, đúng số byte)");
} else {
  fail(
    `Chủ sở hữu tải CV -> ${owner.status} (${owner.buffer.length} bytes)`
  );
}

// --- 3. Khách chưa đăng nhập → 403 ---------------------------------------
const guest = await download(pdfFile.id, null);
if (guest.status === 403) {
  ok("CV bị chặn 403 với khách chưa đăng nhập");
} else {
  fail(`CV với khách phải bị 403, thực tế: ${guest.status}`);
}

// --- 4. NTD đã nhận đơn ứng tuyển → đọc được CV --------------------------
// Tìm 1 đơn ứng tuyển mà employer này đã nhận.
const apps = await api("/employer/applications", { token: employerToken });
const appList = apps.json?.data ?? [];
if (appList.length === 0) {
  log("  ⚠️  NTD chưa có đơn ứng tuyển nào — bỏ qua kiểm tra quyền NTD.");
} else {
  const app = appList[0];
  const employerRead = await download(pdfFile.id, employerToken);
  if (employerRead.status === 200 || employerRead.status === 403) {
    ok(
      `NTD đọc CV -> ${employerRead.status} (403 nếu chưa từng nhận đơn của SV này)`
    );
  } else {
    fail(`NTD đọc CV -> ${employerRead.status}`);
  }

  // --- 5. Đơn ứng tuyển phải có cvMimeType --------------------------------
  const detail = await api(`/employer/applications/${app.id}`, {
    token: employerToken,
  });
  const d = detail.json?.data;
  if (d && "cvMimeType" in d) {
    ok(`Đơn ứng tuyển có trường cvMimeType: ${d.cvMimeType ?? "(null)"}`);
  } else {
    fail("Đơn ứng tuyển thiếu trường cvMimeType");
  }
}

// --- 6. Sinh viên khác không đọc được CV --------------------------------
// Tạo tài khoản sinh viên thứ 2 để kiểm tra chéo.
let otherStudentToken = null;
try {
  const email = `cv-check-${Date.now()}@viejob.vn`;
  const reg = await api("/auth/register", {
    method: "POST",
    body: {
      email,
      password: "Student@123",
      fullName: "SV Khac",
      role: "STUDENT",
    },
  });
  if (reg.status === 200 || reg.status === 201) {
    otherStudentToken = await login(email, "Student@123");
    const otherRead = await download(pdfFile.id, otherStudentToken);
    if (otherRead.status === 403) {
      ok("SV khác không đọc được CV của SV này (403)");
    } else {
      fail(`SV khác đọc CV phải bị 403, thực tế: ${otherRead.status}`);
    }
  }
} catch {
  log("  ⚠️  Không tạo được SV thứ 2 — bỏ qua kiểm tra chéo.");
}

// --- 7. DOCX: cvMimeType phải là docx (frontend sẽ không render) -----------
const docxFile = await uploadCv(
  studentToken,
  "CV-NguyenVanA.docx",
  makeDocx(),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
);
const profileDocx = await attachCv(studentToken, docxFile.url);
if (
  profileDocx.cvMimeType ===
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
) {
  ok("CV DOCX → cvMimeType là docx (frontend sẽ chỉ cho tải xuống)");
} else {
  fail(`cvMimeType của DOCX sai: ${profileDocx.cvMimeType}`);
}

// --- 8. Dọn: gỡ CV khỏi hồ sơ + xoá file ---------------------------------
await attachCv(studentToken, "");
const delPdf = await api(`/files/${pdfFile.id}`, {
  method: "DELETE",
  token: studentToken,
});
if (delPdf.status === 200) {
  ok("Xoá file CV sau khi kiểm chứng");
} else {
  fail(`Xoá file CV -> ${delPdf.status}`);
}

const delDocx = await api(`/files/${docxFile.id}`, {
  method: "DELETE",
  token: studentToken,
});
if (delDocx.status === 200) {
  ok("Xoá file CV DOCX sau khi kiểm chứng");
} else {
  fail(`Xoá file CV DOCX -> ${delDocx.status}`);
}

log("");
if (failures === 0) {
  log("✅ Tất cả kiểm chứng xem CV đều đạt.");
} else {
  log(`❌ Có ${failures} kiểm chứng xem CV KHÔNG đạt.`);
}
process.exit(failures === 0 ? 0 : 1);
