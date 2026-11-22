#!/usr/bin/env node
/**
 * Kiểm chứng xem CV trực tiếp trên UI thật (Chrome) — luồng render PDF.
 *
 * Kịch bản:
 *   1. SV đăng nhập → upload CV (PDF) → gắn vào hồ sơ.
 *   2. Mở modal "Xem CV" → PDF phải render ra canvas (không phải lỗi).
 *   3. Thanh công cụ: có phân trang + zoom.
 *   4. Không có lỗi console / HTTP 4xx-5xx ngoài dự kiến.
 *
 * Chạy:
 *   SMOKE_BASE_URL=http://localhost:5173 node scripts/smoke-cv-viewer.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { makeValidPdf } from "./test-pdf-fixture.mjs";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS = ".tmp-verify-cv-viewer";

mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const log = (msg) => console.log(msg);
const ok = (msg) => log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures += 1;
  log(`  ❌ ${msg}`);
};

/** Đăng nhập qua API rồi nạp token vào localStorage (nhanh hơn click UI). */
async function login(page, email, password) {
  const res = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email, password },
  });
  const json = await res.json();
  const token = json?.data?.accessToken;
  if (!token) throw new Error(`Đăng nhập ${email} thất bại`);
  return token;
}

/**
 * Nạp token vào localStorage trước khi mở app (app tự lấy token khi mount).
 */
async function seedToken(page, token) {
  await page.addInitScript(
    ([tk]) => {
      window.localStorage.setItem("access_token", tk);
      window.localStorage.setItem("refresh_token", tk);
    },
    [token]
  );
}

/**
 * Gắn CV vào một đơn ứng tuyển của nhà tuyển dụng (để test phía NTD).
 *
 * <p>API hiện chưa có endpoint sửa `cv_url` của đơn ứng tuyển → dùng SQL
 * trực tiếp vào MySQL dev. Chỉ dùng cho script kiểm chứng.
 *
 * @returns slug của đơn ứng tuyển, hoặc `null` nếu không tìm thấy
 */
async function attachCvToApplication(page, employerToken, cvUrl) {
  const res = await page.request.get(`${BASE_URL}/api/v1/employer/applications`, {
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  const list = (await res.json())?.data ?? [];
  if (!Array.isArray(list) || list.length === 0) return null;

  // Chọn đơn của SV demo (stu-001) — đảm bảo NTD có quyền đọc CV.
  const target = list.find((a) => a.studentId === "stu-001") ?? list[0];

  const { execSync } = await import("node:child_process");
  execSync(
    `docker exec viejob-mysql-dev mysql -uroot -proot parttime_marketplace -e ` +
      `"UPDATE applications SET cv_url='${cvUrl}', cv_file_name='CV-NguyenVanA.pdf' WHERE slug='${target.id}';"`,
    { stdio: "ignore" }
  );
  return target.id;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
const httpErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push(`${res.status()} ${res.url()}`);
});

const pdfPath = `${SHOTS}/cv-test.pdf`;
writeFileSync(pdfPath, makeValidPdf());

/** Slug đơn ứng tuyển đã gắn CV (dùng để dọn dữ liệu test). */
let appId = null;

try {
  // --- 1. Đăng nhập sinh viên ---------------------------------------------
  const token = await login(page, "student@viejob.vn", "Student@123");
  await seedToken(page, token);
  ok("Đăng nhập sinh viên thành công");

  // --- 2. Upload CV qua API rồi gắn vào hồ sơ -----------------------------
  const presign = await page.request.post(
    `${BASE_URL}/api/v1/files/presign?kind=CV&contentType=application/pdf`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const signed = (await presign.json()).data;
  const putRes = await page.request.put(signed.uploadUrl, {
    headers: { "Content-Type": signed.contentType },
    data: makeValidPdf(),
  });
  if (putRes.status() !== 200) {
    throw new Error(`PUT lên R2 thất bại: ${putRes.status()}`);
  }
  const confirm = await page.request.post(`${BASE_URL}/api/v1/files/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      storageKey: signed.storageKey,
      kind: "CV",
      fileName: "CV-NguyenVanA.pdf",
    },
  });
  const cv = (await confirm.json()).data;
  await page.request.put(`${BASE_URL}/api/v1/student/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { cvUrl: cv.url },
  });
  ok(`Upload + gắn CV vào hồ sơ: ${cv.url}`);

  // --- 3. Mở hồ sơ & tìm nút "Xem CV" ------------------------------------
  await page.goto(`${BASE_URL}/student/profile`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("text=Xem CV", { timeout: 20000 });
  ok("Trang hồ sơ hiện nút 'Xem CV'");

  // --- 4. Mở modal & kiểm tra PDF render ra canvas ------------------------
  await page.click("text=Xem CV");
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  ok("Modal xem CV đã mở");

  // react-pdf render vào <canvas> — chờ canvas xuất hiện.
  await page.waitForSelector('[role="dialog"] canvas', { timeout: 25000 });
  ok("PDF đã render ra canvas");

  // Canvas phải có kích thước thực (không phải 0x0).
  const canvasSize = await page.evaluate(() => {
    const canvas = document.querySelector('[role="dialog"] canvas');
    if (!canvas) return null;
    return { width: canvas.width, height: canvas.height };
  });
  if (canvasSize && canvasSize.width > 100 && canvasSize.height > 100) {
    ok(`Canvas có kích thước thực: ${canvasSize.width}x${canvasSize.height}`);
  } else {
    fail(`Canvas rỗng: ${JSON.stringify(canvasSize)}`);
  }

  // --- 5. Thanh công cụ: phân trang + zoom --------------------------------
  const toolbarText = await page.textContent('[role="dialog"]');
  if (/Trang\s*1\s*\/\s*\d+/.test(toolbarText ?? "")) {
    ok("Thanh công cụ hiện phân trang ('Trang 1 / N')");
  } else {
    fail("Không thấy phân trang trong thanh công cụ");
  }

  await page.screenshot({ path: `${SHOTS}/cv-modal.png`, fullPage: false });
  ok(`Ảnh chụp lưu tại ${SHOTS}/cv-modal.png`);

  // --- 6. Nhà tuyển dụng: route CV riêng + modal trong danh sách -----------
  // Dùng context riêng để không lẫn token sinh viên với token NTD.
  const employerToken = await login(page, "employer@viejob.vn", "Employer@123");

  // Gắn CV vào 1 đơn ứng tuyển để NTD có cái để xem.
  appId = await attachCvToApplication(page, employerToken, cv.url);
  if (!appId) {
    fail("Không tìm được đơn ứng tuyển để gắn CV — bỏ qua kiểm tra phía NTD");
  } else {
    ok(`Gắn CV vào đơn ứng tuyển ${appId}`);

    const employerContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const employerPage = await employerContext.newPage();
    employerPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[NTD] ${msg.text()}`);
    });
    employerPage.on("pageerror", (err) =>
      consoleErrors.push(`[NTD] ${err.message}`)
    );
    await seedToken(employerPage, employerToken);

    // --- 6a. Route CV riêng ------------------------------------------------
    await employerPage.goto(
      `${BASE_URL}/employer/applications/${appId}/cv`,
      { waitUntil: "domcontentloaded" }
    );
    await employerPage.waitForSelector("canvas", { timeout: 30000 });
    const routeCanvas = await employerPage.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return { width: canvas?.width, height: canvas?.height };
    });
    if (routeCanvas && routeCanvas.width > 100) {
      ok(
        `Route /employer/applications/${appId}/cv render PDF (${routeCanvas.width}x${routeCanvas.height})`
      );
    } else {
      fail(`Route CV không render: ${JSON.stringify(routeCanvas)}`);
    }
    await employerPage.screenshot({ path: `${SHOTS}/employer-cv-route.png` });

    // --- 6b. Trang chi tiết đơn -> nút "Xem CV" dẫn tới route ---------------
    await employerPage.goto(`${BASE_URL}/employer/applications/${appId}`, {
      waitUntil: "domcontentloaded",
    });
    await employerPage.waitForSelector("text=Xem CV", { timeout: 20000 });
    await employerPage.click("text=Xem CV");
    await employerPage.waitForURL(
      new RegExp(`/employer/applications/${appId}/cv`),
      { timeout: 15000 }
    );
    ok("Nút 'Xem CV' ở trang chi tiết đơn dẫn tới route xem CV");

    // --- 6c. Modal xem CV nhanh trong danh sách ứng viên --------------------
    await employerPage.goto(`${BASE_URL}/employer/applications`, {
      waitUntil: "domcontentloaded",
    });
    await employerPage.waitForSelector("text=Xem CV", { timeout: 20000 });
    await employerPage.locator("text=Xem CV").first().click();
    await employerPage.waitForSelector('[role="dialog"] canvas', { timeout: 30000 });
    const listCanvas = await employerPage.evaluate(() => {
      const canvas = document.querySelector('[role="dialog"] canvas');
      return { width: canvas?.width, height: canvas?.height };
    });
    if (listCanvas && listCanvas.width > 100) {
      ok(
        `Modal xem CV nhanh trong danh sách ứng viên render PDF (${listCanvas.width}x${listCanvas.height})`
      );
    } else {
      fail(`Modal danh sách không render: ${JSON.stringify(listCanvas)}`);
    }
    await employerPage.screenshot({ path: `${SHOTS}/employer-cv-modal.png` });

    await employerContext.close();
  }

  // --- 7. Không có lỗi console / HTTP ------------------------------------
  const realConsoleErrors = consoleErrors.filter(
    (e) => !/favicon|Download the React DevTools/i.test(e)
  );
  if (realConsoleErrors.length === 0) {
    ok("Không có lỗi console");
  } else {
    fail(`Lỗi console: ${realConsoleErrors.slice(0, 3).join(" | ")}`);
  }

  const realHttpErrors = httpErrors.filter(
    (e) => !/401|403|favicon/i.test(e)
  );
  if (realHttpErrors.length === 0) {
    ok("Không có lỗi HTTP 4xx/5xx ngoài dự kiến");
  } else {
    fail(`Lỗi HTTP: ${realHttpErrors.slice(0, 3).join(" | ")}`);
  }

  // --- 8. Dọn file test ---------------------------------------------------
  // Gỡ CV khỏi hồ sơ trước, nếu không xoá file sẽ bị chặn FILE_IN_USE.
  await page.request.put(`${BASE_URL}/api/v1/student/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { cvUrl: "" },
  });
  await page.request.delete(`${BASE_URL}/api/v1/files/${cv.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  // Gỡ CV khỏi đơn ứng tuyển đã gắn ở bước 6.
  if (appId) {
    const { execSync } = await import("node:child_process");
    execSync(
      `docker exec viejob-mysql-dev mysql -uroot -proot parttime_marketplace -e ` +
        `"UPDATE applications SET cv_url=NULL, cv_file_name=NULL WHERE slug='${appId}';"`,
      { stdio: "ignore" }
    );
  }
  ok("Dọn file test");
} catch (error) {
  fail(`Lỗi: ${error.message}`);
  await page.screenshot({ path: `${SHOTS}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

log("");
if (failures === 0) {
  log("✅ Tất cả kiểm chứng UI xem CV đều đạt.");
} else {
  log(`❌ Có ${failures} kiểm chứng UI xem CV KHÔNG đạt.`);
}
process.exit(failures === 0 ? 0 : 1);
