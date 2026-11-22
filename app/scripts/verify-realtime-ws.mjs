/**
 * 🧪 Kiểm chứng realtime thông báo end-to-end (backend thật + WebSocket thật).
 *
 * Kiểm tra đủ 7 sự kiện trong danh mục thông báo:
 *   1. Sinh viên ứng tuyển        -> Nhà tuyển dụng   (APPLICATION)
 *   2. NTD đổi trạng thái đơn     -> Sinh viên        (APPLICATION_STATUS)
 *   3. Sinh viên rút đơn          -> Nhà tuyển dụng   (APPLICATION_STATUS)
 *   4. NTD đăng tin mới           -> Tất cả Admin     (JOB)
 *   5. Admin duyệt tin            -> Nhà tuyển dụng   (JOB)
 *   6. Admin từ chối tin          -> Nhà tuyển dụng   (JOB)
 *   7. Đánh giá mới               -> Người bị đánh giá (REVIEW)
 *
 * Script idempotent: mỗi lần chạy tạo tin tuyển dụng mới nên không bị chặn
 * "đã ứng tuyển rồi".
 *
 * Chạy: node scripts/verify-realtime-ws.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:8081";

const log = (...args) => console.log(...args);
const ok = (msg) => log("  [PASS] " + msg);
const fail = (msg) => {
  log("  [FAIL] " + msg);
  process.exitCode = 1;
};

// ============================================
// HELPERS
// ============================================

async function login(email, password) {
  const res = await fetch(BASE + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json?.data?.accessToken) {
    throw new Error("Đăng nhập " + email + " thất bại: " + JSON.stringify(json));
  }
  return json.data;
}

async function api(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

/** Mở WebSocket qua vé một-lần và gom các frame nhận được. */
async function openSocket(token, label) {
  const ticketRes = await api(token, "POST", "/api/v1/ws/ticket");
  if (ticketRes.status !== 200) {
    throw new Error("Cấp vé thất bại (" + label + "): " + JSON.stringify(ticketRes.json));
  }
  const ticket = ticketRes.json.data.ticket;

  const wsUrl =
    BASE.replace(/^http/, "ws") +
    "/ws/notifications?ticket=" +
    encodeURIComponent(ticket);

  const socket = new WebSocket(wsUrl);
  const frames = [];

  socket.addEventListener("message", (event) => {
    try {
      frames.push(JSON.parse(event.data));
    } catch {
      /* bỏ qua frame không hợp lệ */
    }
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout mở socket (" + label + ")")),
      8000
    );
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("Không mở được socket (" + label + ")"));
    });
  });

  log("  [i] " + label + ": đã kết nối WebSocket");
  return { socket, frames };
}

/** Chờ tới khi có frame khớp predicate (timeout 8s). */
function waitForFrame(frames, predicate, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const found = frames.find(predicate);
      if (found) {
        clearInterval(timer);
        resolve(found);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, 120);
  });
}

/** Payload tạo tin tuyển dụng tối thiểu mà backend chấp nhận. */
function buildJobPayload(title) {
  return {
    title,
    description: "Tin tạo tự động cho kiểm chứng realtime thông báo.",
    requirements: ["Sinh viên năng động"],
    benefits: ["Ca linh hoạt"],
    category: { id: "cat-fnb", name: "F&B, Barista & Phục vụ" },
    position: { id: "pos-phuc-vu", name: "Phục vụ" },
    employmentType: "PART_TIME",
    workMode: "ONSITE",
    salaryType: "HOURLY",
    salaryMin: 15000,
    salaryMax: 25000,
    positionsCount: 2,
    location: {
      provinceId: "79",
      districtId: "q1",
      address: "123 Nguyễn Huệ",
    },
    schedules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }],
    skills: [],
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  log("\n🧪 Kiểm chứng realtime thông báo — " + BASE + "\n");

  log("▶ Bước 1: Đăng nhập 3 vai trò");
  const student = await login("student@viejob.vn", "Student@123");
  const employer = await login("employer@viejob.vn", "Employer@123");
  const admin = await login("admin@viejob.vn", "Admin@123");
  ok("Đã đăng nhập sinh viên + nhà tuyển dụng + quản trị viên");

  log("\n▶ Bước 2: Vé WebSocket");
  const studentWs = await openSocket(student.accessToken, "Sinh viên");
  const employerWs = await openSocket(employer.accessToken, "Nhà tuyển dụng");
  const adminWs = await openSocket(admin.accessToken, "Quản trị viên");

  // Vé không hợp lệ phải bị từ chối (403).
  // Gọi bằng HTTP vì `fetch` không hỗ trợ scheme ws://.
  try {
    const bad = await fetch(BASE + "/ws/notifications?ticket=invalid-ticket");
    if (bad.status === 403) {
      ok("Vé không hợp lệ bị từ chối (403)");
    } else {
      fail("Vé không hợp lệ phải bị từ chối, thực tế: " + bad.status);
    }
  } catch (error) {
    fail("Không xác định được trạng thái khi dùng vé không hợp lệ: " + error.message);
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 4: NTD đăng tin -> Admin
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 4: NTD đăng tin mới -> Admin nhận thông báo");
  const stamp = Date.now();
  const createRes = await api(
    employer.accessToken,
    "POST",
    "/api/v1/employer/jobs",
    buildJobPayload("Tin kiểm chứng realtime " + stamp)
  );
  let jobId = null;
  if (createRes.status === 201 || createRes.status === 200) {
    jobId = createRes.json?.data?.id;
    ok("NTD đăng tin thành công: " + jobId);
  } else {
    fail("Đăng tin thất bại: " + JSON.stringify(createRes.json).slice(0, 300));
  }

  const adminFrame = await waitForFrame(
    adminWs.frames,
    (f) => f.type === "JOB" && (f.title ?? "").includes("chờ duyệt")
  );
  if (adminFrame) {
    ok(
      'Admin nhận frame: "' + adminFrame.title + '" | link=' + adminFrame.link
    );
  } else {
    fail("Admin không nhận được frame JOB. Frames: " + JSON.stringify(adminWs.frames));
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 5: Admin duyệt -> NTD
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 5: Admin duyệt tin -> NTD nhận thông báo");
  if (jobId) {
    const approveRes = await api(
      admin.accessToken,
      "PATCH",
      "/api/v1/admin/jobs/" + jobId + "/review",
      { action: "APPROVE" }
    );
    if (approveRes.status === 200) {
      ok("Admin duyệt tin thành công");
    } else {
      fail("Duyệt tin thất bại: " + JSON.stringify(approveRes.json).slice(0, 300));
    }

    const approveFrame = await waitForFrame(
      employerWs.frames,
      (f) => f.type === "JOB" && (f.title ?? "").includes("được duyệt")
    );
    if (approveFrame) {
      ok('NTD nhận frame: "' + approveFrame.title + '" | link=' + approveFrame.link);
    } else {
      fail("NTD không nhận được frame JOB duyệt. Frames: " + JSON.stringify(employerWs.frames));
    }
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 1: Sinh viên ứng tuyển -> NTD
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 1: Sinh viên ứng tuyển -> NTD nhận thông báo");
  let applicationId = null;
  if (jobId) {
    const applyRes = await api(
      student.accessToken,
      "POST",
      "/api/v1/student/applications",
      { jobId, expectedSalary: 0, coverLetter: "Xin ứng tuyển." }
    );
    if (applyRes.status === 200 || applyRes.status === 201) {
      applicationId = applyRes.json?.data?.id;
      ok("Ứng tuyển thành công: " + applicationId);
    } else {
      fail("Ứng tuyển thất bại: " + JSON.stringify(applyRes.json).slice(0, 300));
    }
  }

  const applyFrame = await waitForFrame(
    employerWs.frames,
    (f) => f.type === "APPLICATION" && (f.title ?? "").includes("ứng viên")
  );
  if (applyFrame) {
    ok(
      'NTD nhận frame: "' +
        applyFrame.title +
        '" | link=' +
        applyFrame.link +
        " | unread=" +
        applyFrame.unreadCount
    );
  } else {
    fail("NTD không nhận được frame APPLICATION. Frames: " + JSON.stringify(employerWs.frames));
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 2: NTD đổi trạng thái -> Sinh viên
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 2: NTD đổi trạng thái -> SV nhận thông báo");
  if (applicationId) {
    const statusRes = await api(
      employer.accessToken,
      "PATCH",
      "/api/v1/employer/applications/" + applicationId,
      { status: "SHORTLISTED", note: "Hồ sơ phù hợp, đã duyệt sơ bộ" }
    );
    if (statusRes.status === 200) {
      ok("Cập nhật trạng thái thành công");
    } else {
      fail("Cập nhật trạng thái thất bại: " + JSON.stringify(statusRes.json).slice(0, 300));
    }
  }

  const statusFrame = await waitForFrame(
    studentWs.frames,
    (f) => f.type === "APPLICATION_STATUS" && (f.title ?? "").includes("Cập nhật đơn")
  );
  if (statusFrame) {
    ok(
      'SV nhận frame: "' +
        statusFrame.title +
        '" | link=' +
        statusFrame.link +
        " | unread=" +
        statusFrame.unreadCount
    );
  } else {
    fail("SV không nhận được frame APPLICATION_STATUS. Frames: " + JSON.stringify(studentWs.frames));
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 3: Sinh viên rút đơn -> NTD
  // ------------------------------------------------------------------
  // Đơn ở sự kiện 1 đã chuyển sang SHORTLISTED nên không rút được nữa
  // (chỉ rút được khi còn PENDING) -> tạo tin + đơn riêng cho kịch bản này.
  log("\n▶ Sự kiện 3: Sinh viên rút đơn -> NTD nhận thông báo");
  const withdrawJobCreate = await api(
    employer.accessToken,
    "POST",
    "/api/v1/employer/jobs",
    buildJobPayload("Tin kiểm chứng rút đơn " + stamp)
  );
  if (withdrawJobCreate.status === 201 || withdrawJobCreate.status === 200) {
    const withdrawJobId = withdrawJobCreate.json?.data?.id;
    await api(
      admin.accessToken,
      "PATCH",
      "/api/v1/admin/jobs/" + withdrawJobId + "/review",
      { action: "APPROVE" }
    );

    const withdrawApply = await api(
      student.accessToken,
      "POST",
      "/api/v1/student/applications",
      { jobId: withdrawJobId, expectedSalary: 0, coverLetter: "Xin ứng tuyển." }
    );
    const withdrawApplicationId = withdrawApply.json?.data?.id;

    if (withdrawApplicationId) {
      const withdrawRes = await api(
        student.accessToken,
        "PATCH",
        "/api/v1/student/applications/" + withdrawApplicationId + "/withdraw"
      );
      if (withdrawRes.status === 200) {
        ok("Rút đơn thành công");
      } else {
        fail(
          "Rút đơn thất bại: " + JSON.stringify(withdrawRes.json).slice(0, 300)
        );
      }
    } else {
      fail(
        "Ứng tuyển để rút đơn thất bại: " +
          JSON.stringify(withdrawApply.json).slice(0, 300)
      );
    }
  } else {
    fail(
      "Tạo tin để rút đơn thất bại: " +
        JSON.stringify(withdrawJobCreate.json).slice(0, 200)
    );
  }

  const withdrawFrame = await waitForFrame(
    employerWs.frames,
    (f) => f.type === "APPLICATION_STATUS" && (f.title ?? "").includes("rút")
  );
  if (withdrawFrame) {
    ok('NTD nhận frame: "' + withdrawFrame.title + '" | link=' + withdrawFrame.link);
  } else {
    fail("NTD không nhận được frame rút đơn. Frames: " + JSON.stringify(employerWs.frames));
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 6: Admin từ chối tin -> NTD
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 6: Admin từ chối tin -> NTD nhận thông báo");
  const rejectCreate = await api(
    employer.accessToken,
    "POST",
    "/api/v1/employer/jobs",
    buildJobPayload("Tin bị từ chối " + stamp)
  );
  if (rejectCreate.status === 201 || rejectCreate.status === 200) {
    const rejectJobId = rejectCreate.json?.data?.id;
    await api(
      admin.accessToken,
      "PATCH",
      "/api/v1/admin/jobs/" + rejectJobId + "/review",
      { action: "REJECT", reason: "Thiếu mô tả chi tiết" }
    );

    const rejectFrame = await waitForFrame(
      employerWs.frames,
      (f) => f.type === "JOB" && (f.title ?? "").includes("từ chối")
    );
    if (rejectFrame) {
      ok('NTD nhận frame: "' + rejectFrame.title + '" | link=' + rejectFrame.link);
    } else {
      fail("NTD không nhận được frame JOB từ chối. Frames: " + JSON.stringify(employerWs.frames));
    }
  } else {
    fail("Tạo tin để từ chối thất bại: " + JSON.stringify(rejectCreate.json).slice(0, 200));
  }

  // ------------------------------------------------------------------
  // SỰ KIỆN 7: Đánh giá mới -> Người bị đánh giá
  // ------------------------------------------------------------------
  log("\n▶ Sự kiện 7: Sinh viên đánh giá -> NTD nhận thông báo");
  // Đánh giá chỉ hợp lệ khi đơn ứng tuyển đã COMPLETED, mà đơn đã rút ở
  // sự kiện 3 thì không dùng lại được -> tạo tin + đơn riêng cho kịch bản này.
  const reviewJobCreate = await api(
    employer.accessToken,
    "POST",
    "/api/v1/employer/jobs",
    buildJobPayload("Tin kiểm chứng đánh giá " + stamp)
  );
  if (reviewJobCreate.status === 201 || reviewJobCreate.status === 200) {
    const reviewJobId = reviewJobCreate.json?.data?.id;
    await api(
      admin.accessToken,
      "PATCH",
      "/api/v1/admin/jobs/" + reviewJobId + "/review",
      { action: "APPROVE" }
    );

    const reviewApply = await api(
      student.accessToken,
      "POST",
      "/api/v1/student/applications",
      { jobId: reviewJobId, expectedSalary: 0, coverLetter: "Xin ứng tuyển." }
    );
    const reviewApplicationId = reviewApply.json?.data?.id;

    if (reviewApplicationId) {
      await api(
        employer.accessToken,
        "PATCH",
        "/api/v1/employer/applications/" + reviewApplicationId,
        { status: "COMPLETED", note: "Công việc đã hoàn thành" }
      );

      const reviewRes = await api(student.accessToken, "POST", "/api/v1/reviews", {
        applicationId: reviewApplicationId,
        rating: 5,
        comment: "Công việc tốt, đồng nghiệp hợp tác.",
      });
      if (reviewRes.status === 201 || reviewRes.status === 200) {
        ok("Sinh viên đánh giá thành công");
      } else {
        fail("Đánh giá thất bại: " + JSON.stringify(reviewRes.json).slice(0, 300));
      }
    } else {
      fail("Không tạo được đơn cho kịch bản đánh giá");
    }
  } else {
    fail("Không tạo được tin cho kịch bản đánh giá");
  }

  const reviewFrame = await waitForFrame(
    employerWs.frames,
    (f) => f.type === "REVIEW"
  );
  if (reviewFrame) {
    ok('NTD nhận frame: "' + reviewFrame.title + '" | link=' + reviewFrame.link);
  } else {
    fail("NTD không nhận được frame REVIEW. Frames: " + JSON.stringify(employerWs.frames));
  }

  // ------------------------------------------------------------------
  // ĐỐI CHIẾU VỚI REST (nguồn sự thật)
  // ------------------------------------------------------------------
  log("\n▶ Đối chiếu với REST (nguồn sự thật)");
  const countRes = await api(student.accessToken, "GET", "/api/v1/notifications/unread-count");
  const restCount = countRes.json?.data?.count;
  const lastFrame = studentWs.frames[studentWs.frames.length - 1];

  if (typeof restCount === "number") {
    ok("REST unread-count = " + restCount);
  } else {
    fail("Không đọc được unread-count từ REST");
  }
  if (lastFrame && typeof lastFrame.unreadCount === "number") {
    if (lastFrame.unreadCount === restCount) {
      ok("unreadCount trong frame khớp REST (" + restCount + ")");
    } else {
      fail(
        "unreadCount frame (" + lastFrame.unreadCount + ") khác REST (" + restCount + ")"
      );
    }
  }

  studentWs.socket.close();
  employerWs.socket.close();
  adminWs.socket.close();

  log("\n" + (process.exitCode ? "❌ CÓ LỖI" : "✅ TẤT CẢ ĐỀU PASS") + "\n");
}

main().catch((error) => {
  console.error("\n💥 Lỗi: " + error.message);
  process.exit(1);
});
