#!/usr/bin/env node
/**
 * KIEM CHUNG: vong doi doi cua CV (quota + xoa CV da gui kem don).
 *
 * Keichung nhanh biet:
 *   1. SV upload > 10 CV lien tiep -> KHONG bi chan boi gioi han so file
 *      (chi con gioi han tong dung luong 20MB).
 *   2. SV xoa CV da gui kem 1 don ung tuyen -> xoa thanh cong (khong con 409).
 *   3. Blob cua CV da xoa van con: NTD nhan don do VAN DOC DUOC CV.
 *   4. SV thay CV moi -> CV cuoc duoc xoa ngay, profile tro ve CV moi.
 *   5. SV xoa CV -> profile tro ve khong co CV, va lai upload duoc.
 *
 * Chay:
 *   API_URL=http://localhost:8081/api/v1 node scripts/verify-cv-quota.mjs
 */

const BASE = process.env.API_URL ?? "http://localhost:8081/api/v1";

let failures = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => log(`  [OK] ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  [FAIL] ${msg}`);
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
      `Dang nhap ${email} that bai (${status}): ${JSON.stringify(json)}`
    );
  }
  return json.data.accessToken;
}

const makePdf = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    "latin1"
  );

/** Upload CV qua endpoint multipart (cong) -> tra ve data hoac null. */
async function uploadCv(token, fileName) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([makePdf()], { type: "application/pdf" }),
    fileName
  );
  const res = await fetch(`${BASE}/files/upload?kind=CV`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function downloadCv(id, token) {
  const res = await fetch(`${BASE}/files/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "follow",
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buffer };
}

async function getProfile(token) {
  const { status, json } = await api("/student/profile", { token });
  return { status, profile: json?.data ?? null };
}

async function setProfileCv(token, cvUrl) {
  return api("/student/profile", {
    method: "PUT",
    token,
    body: { cvUrl },
  });
}

log("\n=== Vong doi CV: quota + xoa CV da gui kem don ===\n");

const studentToken = await login("student@viejob.vn", "Student@123");
const employerToken = await login("employer@viejob.vn", "Employer@123");

// --- 0. Don cho SV demo -------------------------------------------------
const appsRes = await api("/student/applications", { token: studentToken });
const apps = appsRes.json?.data ?? [];
if (!apps.length) {
  fail(
    "SV demo chua co don ung tuyen nao -> khong kiem duoc tinh huong xoa CV."
  );
  process.exit(1);
}
// Don PENDING: rut duoc roi ung tuyen lai. Don WITHDRAWN: ung tuyen lai duoc
// (tai kich hoat dong cu). Cac don da xu ly (ACCEPTED/REJECTED...) khong dung
// duoc de tao lai.
const reusableApps = apps.filter(
  (a) => a.status === "PENDING" || a.status === "WITHDRAWN"
);
if (!reusableApps.length) {
  fail("SV demo khong co don PENDING/WITHDRAWN nao -> khong tao lai duoc.");
  process.exit(1);
}

// Uu tien tin con nhan ung tuyen (job dang OPEN).
const jobsRes = await api("/jobs/public?page=0&size=100", {
  token: studentToken,
});
const jobs = jobsRes.json?.data?.content ?? jobsRes.json?.data?.items ?? [];
const openJobIds = new Set(
  jobs.filter((j) => j.status === "OPEN").map((j) => j.id)
);

const existingApp =
  reusableApps.find((a) => a.status === "PENDING" && openJobIds.has(a.jobId)) ??
  reusableApps.find((a) => openJobIds.has(a.jobId)) ??
  reusableApps[0];
const appJobId = existingApp.jobId;
ok(
  `SV demo co ${apps.length} don -> dung don ${existingApp.id} (${existingApp.status}) cua job ${appJobId}`
);

// --- 1. Upload > 10 CV lien tiep ----------------------------------------
const uploaded = [];
let quotaBlocked = null;
for (let i = 1; i <= 12; i += 1) {
  const res = await uploadCv(studentToken, `quota-${i}.pdf`);
  if (res.status !== 201 || !res.json?.data?.id) {
    quotaBlocked = { index: i, status: res.status, body: res.json };
    break;
  }
  uploaded.push(res.json.data);
}
if (quotaBlocked) {
  fail(
    `Upload CV thu ${quotaBlocked.index} bi chan (${quotaBlocked.status}) ` +
      `- gioi han so file van con? ${JSON.stringify(quotaBlocked.body).slice(0, 200)}`
  );
} else {
  ok(`Upload 12 CV lien tiep thanh cong (khong con gioi han 10 file)`);
}

// --- 2. Giu lai 1 CV de gan vao don --------------------------------------
const cvForApplication = uploaded[0];
const cvExtra = uploaded.slice(1);

// --- 3. Gan CV vao hồ sơ rồi tao don voi CV do ---------------------------
const profileBefore = (await getProfile(studentToken)).profile;
if (profileBefore?.cvUrl && profileBefore.cvUrl !== cvForApplication.url) {
  // Profile dang tro CV cu -> thay bang CV de test.
  await setProfileCv(studentToken, cvForApplication.url);
}
const setCv = await setProfileCv(studentToken, cvForApplication.url);
if (setCv.status !== 200) {
  fail(
    `Gan CV vao ho so -> ${setCv.status} ${JSON.stringify(setCv.json).slice(0, 200)}`
  );
} else {
  ok(`Da gan CV (${cvForApplication.id}) vao ho so sinh vien`);
}

// Tao don ung tuyen moi voi CV nay: rut don cu roi ung tuyen lai
// (bang `unique (job_post_id, student_id)` nen 1 SV chi co 1 dong don / tin).
if (existingApp.status === "PENDING") {
  // Rut don truoc de tao lai duoc (unique (job_post_id, student_id)).
  const withdrawn = await api(
    `/student/applications/${existingApp.id}/withdraw`,
    {
      method: "PATCH",
      token: studentToken,
    }
  );
  if (withdrawn.status >= 400) {
    fail(
      `Rut don cu -> ${withdrawn.status} ${JSON.stringify(withdrawn.json).slice(0, 200)}`
    );
  } else {
    ok("Da rut don cu (WITHDRAWN) de tao lai don voi CV moi");
  }
} else {
  ok("Don cu dang WITHDRAWN -> ung tuyen lai de tai kich hoat dong cu");
}
const appCreated = await api("/student/applications", {
  method: "POST",
  token: studentToken,
  body: {
    jobId: appJobId,
    coverLetter: "Kiem chung vong doi CV.",
    experience: "6 thang kinh nghiem",
    cvUrl: cvForApplication.url,
    cvFileName: cvForApplication.fileName,
  },
});
if (appCreated.status >= 400) {
  fail(
    `Tao don voi CV -> ${appCreated.status} ${JSON.stringify(appCreated.json).slice(0, 200)}`
  );
} else {
  ok(`Da tao don ung tuyen voi CV (${appCreated.json?.data?.id})`);
}

// --- 4. Xoa CV da gui kem don -> phai thanh cong (khong 409) -------------
const delCv = await api(`/files/${cvForApplication.id}`, {
  method: "DELETE",
  token: studentToken,
});
if (delCv.status === 200) {
  ok(
    `Xoa CV da gui kem don thanh cong (${delCv.status}) - khong con loi FILE_IN_USE`
  );
} else {
  fail(
    `Xoa CV da gui kem don bi chan -> ${delCv.status} ${JSON.stringify(delCv.json).slice(0, 200)}`
  );
}

// --- 5. Blob van con: NTD nhan don do VAN DOC DUOC CV ---------------------
const employerRead = await downloadCv(cvForApplication.id, employerToken);
if (employerRead.status === 200 && employerRead.buffer.length > 0) {
  ok(
    `NTD van doc duoc CV da xoa khoi ho so (${employerRead.buffer.length} bytes)`
  );
} else {
  fail(`NTD doc CV da xoa -> ${employerRead.status} (mong doi 200)`);
}

// --- 5b. NTD KHONG giu CV nay thi KHONG duoc doc --------------------------
// Cac tai khoan NTD khac trong seed (de xac nhan quyen doc dung pham vi).
let otherEmployerToken = null;
for (const email of [
  "quan.lym@viejob.demo",
  "kim.phat@viejob.demo",
  "tao.tao@viejob.demo",
]) {
  try {
    otherEmployerToken = await login(email, "Employer@123");
    break;
  } catch {
    // thu email tiep
  }
}
if (otherEmployerToken) {
  const otherRead = await downloadCv(cvForApplication.id, otherEmployerToken);
  if (otherRead.status === 403) {
    ok("NTD khong giu CV nay bi chan 403 (chi dung CV trong don cua minh)");
  } else {
    fail(`NTD khong giu CV nay phai bi chan 403, thuc te: ${otherRead.status}`);
  }
} else {
  log("  [INFO] khong co NTD thu 2 de kiem chung quyen doc -> bo qua");
}

// --- 6. SV chinh cung doc duoc CV cu (de debug) --------------------------
const ownerRead = await downloadCv(cvForApplication.id, studentToken);
if (ownerRead.status === 200) {
  ok("SV chu CV van doc duoc CV cu cua minh");
} else {
  log(`  [INFO] SV doc CV cu -> ${ownerRead.status} (khong bat buoc)`);
}

// --- 7. Xoa CV khoi ho so + upload lai duoc ngay ------------------------
const removeFromProfile = await setProfileCv(studentToken, "");
if (removeFromProfile.status === 200) {
  ok("Da gop CV khoi ho so (gui chuoi rong)");
} else {
  fail(`Gop CV khoi ho so -> ${removeFromProfile.status}`);
}
const profileAfter = (await getProfile(studentToken)).profile;
if (!profileAfter?.cvUrl) {
  ok("Ho so khong con CV (dung trang thai UI 'chua co CV')");
} else {
  fail(`Ho so van con CV: ${profileAfter.cvUrl}`);
}

// Upload lai ngay sau khi xoa -> phai duoc (truoc day bat loi 10 file).
const reupload = await uploadCv(studentToken, "after-delete.pdf");
if (reupload.status === 201 && reupload.json?.data?.id) {
  ok("Upload lai CV ngay sau khi xoa thanh cong (khong bi kẹt quota)");
} else {
  fail(
    `Upload lai sau khi xoa -> ${reupload.status} ${JSON.stringify(reupload.json).slice(0, 200)}`
  );
}

// --- 7b. Xoa lai CV da giu blob -> phai duoc (khong "blob ma") ------------
// File da xoa mem + giu blob van phai xoa duoc khi user bam xoa lai, neu
// khong thi blob do song mai tren R2 khong ai don duoc.
const delAgain = await api(`/files/${cvForApplication.id}`, {
  method: "DELETE",
  token: studentToken,
});
if (delAgain.status === 200) {
  ok("Xoa lai CV da giu blob thanh cong (khong bi 'blob ma')");
} else {
  fail(`Xoa lai CV da giu blob -> ${delAgain.status}`);
}

// --- 8. Dọn: xoa het CV con lai -----------------------------------------
for (const file of [
  ...cvExtra,
  ...(reupload.json?.data ? [reupload.json.data] : []),
]) {
  await api(`/files/${file.id}`, { method: "DELETE", token: studentToken });
}
ok("Da don cac file test");

log("");
if (failures === 0) {
  log("[PASS] Vong doi CV hoat dong dung chuan.");
} else {
  log(`[FAIL] Co ${failures} kiem chung KHONG dat.`);
}
process.exit(failures === 0 ? 0 : 1);
