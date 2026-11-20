#!/usr/bin/env node
/**
 * Kiểm chứng phản hồi 2 chiều cho đánh giá — chạy với API thật (Docker).
 *
 * Kịch bản:
 *   1. SV đăng nhập, xem đánh giá mình đã nhận từ NTD.
 *   2. SV phản hồi 1 đánh giá -> kiểm tra `reply` được ghi.
 *   3. SV phản hồi đánh giá của SV khác -> phải bị 403.
 *   4. NTD đăng nhập, phản hồi lại đánh giá mình đã viết -> `reviewerReply`.
 *   5. NTD phản hồi đánh giá không thuộc mình -> 403.
 *   6. Bên nhận phản hồi phải nhận được thông báo `REVIEW`.
 */

const BASE = process.env.API_URL ?? "http://localhost:8080/api/v1";
/** Gốc server — WebSocket nằm ngoài `/api/v1`. */
const SERVER = BASE.replace(/\/api\/v1\/?$/, "");

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
    throw new Error(`Đăng nhập ${email} thất bại (${status}): ${JSON.stringify(json)}`);
  }
  return json.data.accessToken;
}

/** Mở WebSocket qua vé một-lần và gom các frame nhận được. */
async function openSocket(token, label) {
  const ticket = await api("/ws/ticket", { method: "POST", token });
  if (ticket.status !== 200 || !ticket.json?.data?.ticket) {
    throw new Error(`Cấp vé thất bại (${label}): ${JSON.stringify(ticket.json)}`);
  }

  const wsUrl = `${SERVER.replace(/^http/, "ws")}/ws/notifications?ticket=${encodeURIComponent(ticket.json.data.ticket)}`;
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
    const timer = setTimeout(() => reject(new Error(`Timeout mở socket (${label})`)), 8000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error(`Không mở được socket (${label})`));
    });
  });

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

log("\n⭐  Phản hồi 2 chiều cho đánh giá (API thật)");

const studentToken = await login("student@viejob.vn", "Student@123");
const employerToken = await login("employer@viejob.vn", "Employer@123");
const adminToken = await login("admin@viejob.vn", "Admin@123");

// Admin đọc toàn bộ bảng đánh giá (nội bộ / tra cứu).
const allReviews = await api("/reviews?hideHidden=true", { token: adminToken });
const reviews = allReviews.json.data ?? [];

// --- 1. SV xem đánh giá mình đã nhận ---------------------------------------
const studentReviews = await api("/student/reviews", { token: studentToken });
if (studentReviews.status !== 200) {
  fail(`GET /student/reviews -> ${studentReviews.status}`);
} else {
  const list = studentReviews.json.data ?? [];
  if (list.length === 0) {
    fail("SV demo phải có ít nhất 1 đánh giá từ NTD");
  } else {
    ok(`GET /student/reviews trả ${list.length} đánh giá`);

    // --- 2. SV phản hồi đánh giá ----------------------------------------
    const target = list.find((r) => r.reply == null) ?? list[0];
    const stamp = `Kiểm chứng 2 chiều ${Date.now()}`;
    const reply = await api(`/student/reviews/${target.id}/reply`, {
      method: "POST",
      token: studentToken,
      body: { reply: stamp },
    });

    if (reply.status === 200 && reply.json.data?.reply === stamp) {
      ok(`SV phản hồi đánh giá reviewee -> reply = "${stamp}"`);
    } else {
      fail(
        `SV phản hồi đánh giá -> ${reply.status} ${JSON.stringify(reply.json?.data ?? reply.json)}`
      );
    }

    if (reply.json?.data?.reviewerReply === target.reviewerReply) {
      ok("ô reviewerReply không bị ghi đè khi SV phản hồi");
    } else {
      fail(
        `reviewerReply bị đổi: ${target.reviewerReply} -> ${reply.json?.data?.reviewerReply}`
      );
    }

    // --- 3. SV phản hồi đánh giá của SV khác -> 403 -----------------------
    const foreign = reviews.find(
      (r) => r.targetType === "STUDENT" && r.targetUserId !== target.targetUserId
    );
    if (foreign) {
      const forbidden = await api(`/student/reviews/${foreign.id}/reply`, {
        method: "POST",
        token: studentToken,
        body: { reply: "Xin phép" },
      });
      if (forbidden.status === 403) {
        ok(`SV phản hồi đánh giá của SV khác (${foreign.id}) -> 403`);
      } else {
        fail(
          `SV phản hồi đánh giá của SV khác -> ${forbidden.status} (mong đợi 403)`
        );
      }
    } else {
      fail("không tìm thấy đánh giá của sinh viên khác để test 403");
    }
  }
}

// --- 4. NTD phản hồi lại đánh giá mình đã viết -----------------------------
// NTD là reviewer của các đánh giá targetType=STUDENT do chính NTD viết.
const employerUserId = (await api("/employer/profile", { token: employerToken }))
  .json?.data?.userId;

const ownReview = reviews.find(
  (r) => r.targetType === "STUDENT" && r.fromUserId === employerUserId
);

if (!ownReview) {
  fail("NTD demo phải có ít nhất 1 đánh giá đã viết cho sinh viên");
} else {
  // Lấy trạng thái HIỆN TẠI của đánh giá (snapshot đầu có thể đã cũ vì
  // bước 2 vừa ghi phản hồi của SV vào một đánh giá).
  const fresh = await api("/reviews?hideHidden=true", { token: adminToken });
  const currentReview = (fresh.json.data ?? []).find(
    (r) => r.id === ownReview.id
  );

  const stamp = `Phản hồi NTD ${Date.now()}`;
  const reply = await api(`/employer/reviews/${ownReview.id}/reviewer-reply`, {
    method: "POST",
    token: employerToken,
    body: { reply: stamp },
  });

  if (reply.status === 200 && reply.json.data?.reviewerReply === stamp) {
    ok(`NTD phản hồi đánh giá mình đã viết (${ownReview.id}) -> reviewerReply = "${stamp}"`);
  } else {
    fail(
      `NTD phản hồi đánh giá mình đã viết -> ${reply.status} ${JSON.stringify(reply.json?.data ?? reply.json)}`
    );
  }

  // Ô `reply` của SV phải giữ nguyên so với trạng thái hiện tại của review.
  const currentReply = currentReview?.reply ?? null;
  if (reply.json?.data?.reply === currentReply) {
    ok("ô reply của SV không bị ghi đè khi NTD phản hồi");
  } else {
    fail(
      `reply bị đổi: ${currentReply} -> ${reply.json?.data?.reply}`
    );
  }
  // --- 5. NTD phản hồi đánh giá không thuộc mình -> 403 -------------------
  const notMine = reviews.find((r) => r.fromUserId !== employerUserId);
  if (notMine) {
    const forbidden = await api(
      `/employer/reviews/${notMine.id}/reviewer-reply`,
      { method: "POST", token: employerToken, body: { reply: "Xin phép" } }
    );
    if (forbidden.status === 403) {
      ok(`NTD phản hồi đánh giá không thuộc mình (${notMine.id}) -> 403`);
    } else {
      fail(
        `NTD phản hồi đánh giá không thuộc mình -> ${forbidden.status} (mong đợi 403)`
      );
    }
  }
}

// --- 6. Bên nhận phản hồi nhận thông báo REVIEW ------------------------------
const notifications = await api("/notifications", { token: studentToken });
const reviewNotifs = (notifications.json.data ?? []).filter(
  (n) => n.type === "REVIEW"
);
if (reviewNotifs.length > 0) {
  ok(`SV nhận ${reviewNotifs.length} thông báo loại REVIEW`);
} else {
  fail("SV phải nhận thông báo REVIEW khi có phản hồi");
}

// --- 7. Realtime WebSocket đẩy frame REVIEW khi có phản hồi -----------------
let studentWs = null;
try {
  studentWs = await openSocket(studentToken, "sinh viên");
  ok("mở được WebSocket cho sinh viên");

  // NTD phản hồi lại đánh giá -> SV phải nhận frame REVIEW.
  const ownForWs = reviews.find(
    (r) => r.targetType === "STUDENT" && r.fromUserId === employerUserId
  );
  if (ownForWs) {
    await api(`/employer/reviews/${ownForWs.id}/reviewer-reply`, {
      method: "POST",
      token: employerToken,
      body: { reply: `Realtime ${Date.now()}` },
    });

    const frame = await waitForFrame(
      studentWs.frames,
      (f) => f.type === "REVIEW"
    );
    if (frame) {
      ok(`SV nhận frame realtime REVIEW: "${frame.title}" | link=${frame.link}`);
    } else {
      fail(
        "SV không nhận được frame REVIEW qua WebSocket. Frames: " +
          JSON.stringify(studentWs.frames)
      );
    }
  }
} catch (error) {
  fail(`không kiểm chứng được realtime: ${error.message}`);
} finally {
  studentWs?.socket.close();
}

log(
  failures === 0
    ? "\n🎉 Tất cả test phản hồi 2 chiều PASSED!\n"
    : `\n💥 Có ${failures} test FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);
