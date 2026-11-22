#!/usr/bin/env node
/**
 * Kiểm chứng lỗi giao diện khi zoom CV trong viewer.
 *
 * <p>Bối cảnh: `DialogContent` là CSS **grid**. Grid item mặc định có
 * `min-width: auto` → vùng chứa PDF nở rộng theo nội dung (canvas rộng
 * 1200px+) thay vì co theo khung modal. Hệ quả khi zoom to:
 * <ul>
 *   <li>modal tràn ra ngoài màn hình (canvas `right` vượt viewport),</li>
 *   <li>`overflow-x: auto` không bao giờ kích hoạt → không cuộn tới được
 *       phần đã zoom.</li>
 * </ul>
 *
 * <p>Script kiểm chứng 2 ngữ cảnh dùng `CvViewer`:
 * <ol>
 *   <li>Modal "Xem CV" trong hồ sơ sinh viên (và modal của NTD).</li>
 *   <li>Route riêng `/employer/applications/{id}/cv` (không trong modal).</li>
 * </ol>
 *
 * Chạy:
 *   SMOKE_BASE_URL=http://localhost:5173 node scripts/verify-cv-zoom.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { makeValidPdf } from "./test-pdf-fixture.mjs";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const SHOTS = ".tmp-verify-cv-zoom";
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (m) => console.log(`  ✅ ${m}`);
const fail = (m) => {
  failures += 1;
  console.log(`  ❌ ${m}`);
};

/** Đăng nhập qua API rồi lấy access token. */
async function login(page, email, password) {
  const res = await page.request.post(`${BASE_URL}/api/v1/auth/login`, {
    data: { email, password },
  });
  const token = (await res.json())?.data?.accessToken;
  if (!token) throw new Error(`Đăng nhập ${email} thất bại`);
  return token;
}

/** Nạp token vào localStorage trước khi mở app (app tự lấy token khi mount). */
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
 * Upload PDF lên nơi lưu trữ rồi trả về metadata file.
 *
 * <p>Cần file thật vì `pdf.js` không render được fixture PDF rỗng.
 */
async function uploadCv(page, token) {
  const presign = await page.request.post(
    `${BASE_URL}/api/v1/files/presign?kind=CV&contentType=application/pdf`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const signed = (await presign.json()).data;
  await page.request.put(signed.uploadUrl, {
    headers: { "Content-Type": signed.contentType },
    data: makeValidPdf(),
  });
  const confirm = await page.request.post(`${BASE_URL}/api/v1/files/confirm`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      storageKey: signed.storageKey,
      kind: "CV",
      fileName: "CV-ZoomVerify.pdf",
    },
  });
  return (await confirm.json()).data;
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
  const res = await page.request.get(
    `${BASE_URL}/api/v1/employer/applications`,
    {
      headers: { Authorization: `Bearer ${employerToken}` },
    }
  );
  const list = (await res.json())?.data ?? [];
  if (!Array.isArray(list) || list.length === 0) return null;

  const target = list.find((a) => a.studentId === "stu-001") ?? list[0];

  const { execSync } = await import("node:child_process");
  execSync(
    `docker exec viejob-mysql-dev mysql -uroot -proot parttime_marketplace -e ` +
      `"UPDATE applications SET cv_url='${cvUrl}', cv_file_name='CV-ZoomVerify.pdf' WHERE slug='${target.id}';"`,
    { stdio: "ignore" }
  );
  return target.id;
}

/** Bấm nút zoom cho tới khi đạt mức tối đa. */
async function zoomToMax(page) {
  const zoomIn = page.getByRole("button", { name: "Phóng to" });
  for (let i = 0; i < 14; i++) {
    if (await zoomIn.isDisabled()) break;
    await zoomIn.click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1200);
}

/**
 * Đo trạng thái layout sau khi zoom.
 *
 * @param selector phạm vi chứa canvas (`'[role="dialog"]'` hoặc rỗng = document)
 */
async function measure(page, selector) {
  return page.evaluate((sel) => {
    const scope = sel ? document.querySelector(sel) : document;
    const canvas = scope?.querySelector("canvas");
    if (!canvas) return null;

    // Tìm khung scroll ngang chứa canvas.
    let scroller = canvas.parentElement;
    while (scroller && getComputedStyle(scroller).overflowX !== "auto") {
      scroller = scroller.parentElement;
    }
    if (!scroller) return null;

    const before = scroller.scrollLeft;
    scroller.scrollLeft = 9999;
    const after = scroller.scrollLeft;
    scroller.scrollLeft = 0;

    const dialog = document.querySelector('[role="dialog"]');
    const dr = dialog?.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();

    return {
      // Khung scroll có nội dung rộng hơn không (zoom có tác dụng)?
      scrollerScrollW: scroller.scrollWidth,
      scrollerClientW: scroller.clientWidth,
      canScrollX: after > before,
      // Modal có tràn ra ngoài khung không?
      dialogScrollW: dialog?.scrollWidth ?? 0,
      dialogClientW: dialog?.clientWidth ?? 0,
      dialogLeft: dr ? Math.round(dr.left) : 0,
      dialogRight: dr ? Math.round(dr.right) : 0,
      // Canvas có nằm trọn trong viewport không?
      canvasLeft: Math.round(cr.left),
      canvasRight: Math.round(cr.right),
      viewportW: window.innerWidth,
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
    };
  }, selector);
}

/** Kiểm tra một ngữ cảnh đã zoom: modal không tràn + cuộn ngang hoạt động. */
function assertLayout(label, m) {
  if (!m) {
    fail(`${label}: không tìm thấy canvas/khung scroll`);
    return;
  }
  console.log("   ", JSON.stringify(m));

  if (m.dialogScrollW <= m.dialogClientW + 1) {
    ok(`${label}: modal không tràn ngang`);
  } else {
    fail(
      `${label}: modal tràn ngang (${m.dialogScrollW} > ${m.dialogClientW})`
    );
  }

  if (m.dialogRight <= m.viewportW && m.dialogLeft >= 0) {
    ok(`${label}: modal nằm trọn trong viewport`);
  } else {
    fail(
      `${label}: modal nằm ngoài viewport (left=${m.dialogLeft}, right=${m.dialogRight}, vw=${m.viewportW})`
    );
  }

  if (m.scrollerScrollW > m.scrollerClientW + 1) {
    ok(
      `${label}: khung scroll có nội dung rộng hơn (${m.scrollerScrollW} > ${m.scrollerClientW})`
    );
  } else {
    fail(`${label}: khung scroll không tràn — zoom không có tác dụng`);
  }

  if (m.canScrollX) {
    ok(`${label}: cuộn ngang hoạt động`);
  } else {
    fail(`${label}: cuộn ngang KHÔNG hoạt động — không xem được phần đã zoom`);
  }
}

const browser = await chromium.launch();
const consoleErrors = [];

try {
  // =====================================================================
  // 1. MODAL "XEM CV" TRONG HỒ SƠ SINH VIÊN
  // =====================================================================
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`[pageerror] ${e.message}`));

  const studentToken = await login(page, "student@viejob.vn", "Student@123");
  await seedToken(page, studentToken);
  ok("Đăng nhập sinh viên");

  const cv = await uploadCv(page, studentToken);
  await page.request.put(`${BASE_URL}/api/v1/student/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
    data: { cvUrl: cv.url },
  });
  ok(`Upload CV: ${cv.url}`);

  await page.goto(`${BASE_URL}/student/profile`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("text=Xem CV", { timeout: 20000 });
  await page.click("text=Xem CV");
  await page.waitForSelector('[role="dialog"] canvas', { timeout: 30000 });
  ok("Modal xem CV mở, PDF render");

  await zoomToMax(page);
  assertLayout("Modal SV", await measure(page, '[role="dialog"]'));
  await page.screenshot({ path: `${SHOTS}/student-modal-zoom-max.png` });

  // Thu nhỏ lại → modal vẫn phải không tràn.
  const zoomOut = page.getByRole("button", { name: "Thu nhỏ" });
  for (let i = 0; i < 14; i++) {
    if (await zoomOut.isDisabled()) break;
    await zoomOut.click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  const min = await measure(page, '[role="dialog"]');
  if (min && min.dialogScrollW <= min.dialogClientW + 1) {
    ok("Modal SV: zoom nhỏ lại vẫn không tràn");
  } else {
    fail("Modal SV: zoom nhỏ lại vẫn tràn");
  }
  await page.screenshot({ path: `${SHOTS}/student-modal-zoom-min.png` });

  // =====================================================================
  // 2. MODAL "XEM CV" PHÍA NHÀ TUYỂN DỤNG
  // =====================================================================
  const employerToken = await login(page, "employer@viejob.vn", "Employer@123");

  // Gắn CV vào 1 đơn ứng tuyển để NTD có cái để xem.
  const appId = await attachCvToApplication(page, employerToken, cv.url);
  if (!appId) {
    fail("Không tìm được đơn ứng tuyển để gắn CV — bỏ qua kiểm tra phía NTD");
  } else {
    ok(`Gắn CV vào đơn ứng tuyển ${appId}`);

    const employerContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const employerPage = await employerContext.newPage();
    employerPage.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(`[NTD] ${m.text()}`);
    });
    employerPage.on("pageerror", (e) =>
      consoleErrors.push(`[NTD] ${e.message}`)
    );
    await seedToken(employerPage, employerToken);

    await employerPage.goto(`${BASE_URL}/employer/applications`, {
      waitUntil: "domcontentloaded",
    });
    await employerPage.waitForSelector("text=Xem CV", { timeout: 20000 });
    await employerPage.locator("text=Xem CV").first().click();
    await employerPage.waitForSelector('[role="dialog"] canvas', {
      timeout: 30000,
    });
    ok("Modal NTD mở, PDF render");

    await zoomToMax(employerPage);
    assertLayout("Modal NTD", await measure(employerPage, '[role="dialog"]'));
    await employerPage.screenshot({
      path: `${SHOTS}/employer-modal-zoom-max.png`,
    });

    // =====================================================================
    // 3. ROUTE RIÊNG /employer/applications/{id}/cv (KHÔNG TRONG MODAL)
    // =====================================================================
    await employerPage.goto(`${BASE_URL}/employer/applications/${appId}/cv`, {
      waitUntil: "domcontentloaded",
    });
    await employerPage.waitForSelector("canvas", { timeout: 30000 });
    ok(`Route /employer/applications/${appId}/cv render PDF`);

    await zoomToMax(employerPage);
    const route = await measure(employerPage, "");
    console.log("   ", JSON.stringify(route));
    if (route && route.docScrollW <= route.docClientW + 1) {
      ok("Route CV: trang không tràn ngang");
    } else {
      fail(
        `Route CV: trang tràn ngang (${route?.docScrollW} > ${route?.docClientW})`
      );
    }
    if (route?.canScrollX) {
      ok("Route CV: cuộn ngang trong khung PDF hoạt động");
    } else {
      fail("Route CV: cuộn ngang KHÔNG hoạt động");
    }
    await employerPage.screenshot({
      path: `${SHOTS}/employer-route-zoom-max.png`,
    });

    await employerContext.close();
  }

  // =====================================================================
  // 4. KHÔNG CÓ LỖI CONSOLE
  // =====================================================================
  const realErrors = consoleErrors.filter(
    (e) => !/favicon|Download the React DevTools/i.test(e)
  );
  if (realErrors.length === 0) {
    ok("Không có lỗi console");
  } else {
    fail(`Lỗi console: ${realErrors.slice(0, 3).join(" | ")}`);
  }

  // =====================================================================
  // 5. DỌN DỮ LIỆU TEST
  // =====================================================================
  // Gỡ CV khỏi hồ sơ trước, nếu không xoá file sẽ bị chặn FILE_IN_USE.
  await page.request.put(`${BASE_URL}/api/v1/student/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
    data: { cvUrl: "" },
  });
  await page.request.delete(`${BASE_URL}/api/v1/files/${cv.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  // Gỡ CV khỏi đơn ứng tuyển đã gắn ở bước 2.
  if (appId) {
    const { execSync } = await import("node:child_process");
    execSync(
      `docker exec viejob-mysql-dev mysql -uroot -proot parttime_marketplace -e ` +
        `"UPDATE applications SET cv_url=NULL, cv_file_name=NULL WHERE slug='${appId}';"`,
      { stdio: "ignore" }
    );
  }
  ok("Dọn dữ liệu test");
} catch (error) {
  fail(`Lỗi: ${error.message}`);
} finally {
  await browser.close();
}

console.log("");
if (failures === 0) {
  console.log("✅ Tất cả kiểm chứng zoom CV đều đạt.");
} else {
  console.log(`❌ Có ${failures} kiểm chứng zoom CV KHÔNG đạt.`);
}
process.exit(failures === 0 ? 0 : 1);
