#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Smoke test API VieJob Marketplace (chạy trong container backend).
#
#   docker compose exec backend bash /app/scripts/smoke-api.sh
# hoặc
#   docker compose run --rm backend bash /app/scripts/smoke-api.sh
#
# Kiểm chứng vòng đời đầy đủ:
#   1. Đăng nhập 3 vai trò (sinh viên / NTD / admin)
#   2. Sinh viên ứng tuyển vào tin tuyển dụng
#   3. NTD xem & duyệt đơn (ACCEPTED -> COMPLETED)
#   4. Đánh giá 2 chiều (sinh viên đánh giá NTD, NTD đánh giá sinh viên)
#   5. NTD đăng tin mới -> Admin duyệt tin
#   6. Admin quản lý user / nhóm việc / đánh giá
#   7. Master data + thông báo + tin đã lưu
# ---------------------------------------------------------------------
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080/api/v1}"

PASS=0
FAIL=0
FAILED_STEPS=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

STATUS_FILE="$(mktemp)"
PAYLOAD_FILE="$(mktemp)"

step()  { printf "\n${YELLOW}▶ %s${NC}\n" "$1"; }
ok()    { PASS=$((PASS+1)); printf "  ${GREEN}✔ %s${NC}\n" "$1"; }
fail()  { FAIL=$((FAIL+1)); FAILED_STEPS+=("$1"); printf "  ${RED}✘ %s${NC}\n" "$1"; }

# curl wrapper: trả về body, ghi status vào file $STATUS_FILE
# (dùng file thay vì biến vì `BODY=$(call ...)` chạy trong subshell
#  nên biến shell sẽ bị mất scope)
#
# Body JSON được ghi ra file rồi truyền bằng `--data-binary @file`:
# curl trên Git Bash (MSYS) làm hỏng byte UTF-8 khi truyền chuỗi
# trực tiếp qua argv (`-d`), gây lỗi "Invalid UTF-8 middle byte" ở server.
call() {
  local method="$1" path="$2" token="${3:-}" data="${4:-}"
  local args=(-s -o /tmp/body.json -w '%{http_code}' -X "$method" "$BASE_URL$path")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json")
    printf '%s' "$data" > "$PAYLOAD_FILE"
    args+=(--data-binary "@$PAYLOAD_FILE")
  fi
  curl "${args[@]}" > "$STATUS_FILE"
  cat /tmp/body.json
}

# đọc HTTP status của request gần nhất
status() { cat "$STATUS_FILE"; }

# jq-lite: lấy giá trị từ JSON theo đường dẫn đơn giản.
# Ưu tiên node (luôn có sẵn trong môi trường dev), fallback python3, cuối cùng là grep.
jget() {
  local json="$1" path="$2"

  if command -v node >/dev/null 2>&1; then
    printf '%s' "$json" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const path = process.argv[1];
  let data;
  try { data = JSON.parse(raw); } catch { process.stdout.write(""); return; }
  for (const part of path.split(".")) {
    if (part === "") continue;
    if (Array.isArray(data)) {
      const idx = Number(part);
      if (!Number.isInteger(idx) || idx < 0 || idx >= data.length) { process.stdout.write(""); return; }
      data = data[idx];
    } else if (data && typeof data === "object") {
      if (!(part in data)) { process.stdout.write(""); return; }
      data = data[part];
    } else {
      process.stdout.write(""); return;
    }
    if (data === null || data === undefined) { process.stdout.write(""); return; }
  }
  process.stdout.write(typeof data === "object" ? JSON.stringify(data) : String(data));
});
' "$path"
    return
  fi

  if command -v python3 >/dev/null 2>&1 && python3 -c "import json" >/dev/null 2>&1; then
    printf '%s' "$json" | python3 -c "
import sys, json
path = sys.argv[1]
try:
    data = json.load(sys.stdin)
except Exception:
    print(''); sys.exit(0)
for part in path.replace('[]', '').split('.'):
    if part == '':
        continue
    if isinstance(data, list):
        try:
            data = data[int(part)]
        except Exception:
            print(''); sys.exit(0)
    elif isinstance(data, dict):
        data = data.get(part)
    else:
        print(''); sys.exit(0)
    if data is None:
        print(''); sys.exit(0)
if isinstance(data, (dict, list)):
    print(json.dumps(data, ensure_ascii=False))
else:
    print(data)
" "$path"
    return
  fi

  # Fallback cuối cùng: grep (chỉ hỗ trợ key ở cấp cuối)
  printf '%s' "$json" | grep -o "\"${path##*.}\":[^,}]*" | head -1 | cut -d: -f2- | tr -d '"'
}

expect_status() {
  local want="$1" got="$2" label="$3"
  if [ "$want" = "$got" ]; then ok "$label (HTTP $got)"; else fail "$label — HTTP mong đợi $want, nhận $got"; fi
}

expect_contains() {
  local haystack="$1" needle="$2" label="$3"
  if printf '%s' "$haystack" | grep -q "$needle"; then ok "$label"; else fail "$label — không tìm thấy '$needle'"; fi
}

# =====================================================================
step "0. Kiểm tra kết nối"
BODY=$(call GET "/public/categories")
expect_status 200 "$(status)" "GET /public/categories"
expect_contains "$BODY" '"success":true' "envelope thành công"

# =====================================================================
step "1. Đăng nhập 3 vai trò"

BODY=$(call POST "/auth/login" "" '{"email":"student@viejob.vn","password":"Student@123"}')
expect_status 200 "$(status)" "đăng nhập sinh viên"
STUDENT_TOKEN=$(jget "$BODY" "data.accessToken")
[ -n "$STUDENT_TOKEN" ] && ok "nhận access token sinh viên" || fail "thiếu access token sinh viên"

BODY=$(call POST "/auth/login" "" '{"email":"employer@viejob.vn","password":"Employer@123"}')
expect_status 200 "$(status)" "đăng nhập nhà tuyển dụng"
EMPLOYER_TOKEN=$(jget "$BODY" "data.accessToken")
[ -n "$EMPLOYER_TOKEN" ] && ok "nhận access token NTD" || fail "thiếu access token NTD"

BODY=$(call POST "/auth/login" "" '{"email":"admin@viejob.vn","password":"Admin@123"}')
expect_status 200 "$(status)" "đăng nhập quản trị viên"
ADMIN_TOKEN=$(jget "$BODY" "data.accessToken")
[ -n "$ADMIN_TOKEN" ] && ok "nhận access token admin" || fail "thiếu access token admin"

# Sai mật khẩu -> 401
BODY=$(call POST "/auth/login" "" '{"email":"student@viejob.vn","password":"WrongPassword"}')
expect_status 401 "$(status)" "sai mật khẩu trả 401"

# Không token -> 401
BODY=$(call GET "/student/applications")
expect_status 401 "$(status)" "thiếu token trả 401"

# =====================================================================
step "2. Danh sách tin tuyển dụng công khai"
BODY=$(call GET "/jobs/public?page=1&pageSize=5")
expect_status 200 "$(status)" "GET /jobs/public"
JOB_ID=$(jget "$BODY" "data.items.0.id")
[ -n "$JOB_ID" ] && ok "có tin tuyển dụng đầu tiên ($JOB_ID)" || fail "không lấy được tin tuyển dụng"

BODY=$(call GET "/jobs/public/$JOB_ID")
expect_status 200 "$(status)" "GET /jobs/public/{id}"
expect_contains "$BODY" '"schedules"' "chi tiết tin có lịch làm việc"

BODY=$(call GET "/jobs/public?keyword=barista")
expect_status 200 "$(status)" "lọc theo từ khoá"

# =====================================================================
step "3. Master data"
for path in "/public/categories" "/public/positions" "/public/provinces" "/public/districts" "/public/skills" "/public/salary-benchmarks"; do
  BODY=$(call GET "$path")
  expect_status 200 "$(status)" "GET $path"
done

# Endpoint không tồn tại phải trả 404 (không phải 500) với envelope chuẩn
BODY=$(call GET "/public/endpoint-khong-ton-tai")
expect_status 404 "$(status)" "route không tồn tại trả 404"
expect_contains "$BODY" '"code":"NOT_FOUND"' "404 có mã lỗi NOT_FOUND"

# HEAD phải được phép trên endpoint công khai (healthcheck dùng HEAD)
HEAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -I "$BASE_URL/public/categories")
expect_status 200 "$HEAD_STATUS" "HEAD /public/categories"

# =====================================================================
step "4. Sinh viên ứng tuyển"

# Chọn tin tuyển dụng mà sinh viên demo CHƯA ứng tuyển, đồng thời thuộc
# nhà tuyển dụng demo (để các bước duyệt đơn / đánh giá 2 chiều chạy được).
# Nhờ vậy script chạy lại nhiều lần vẫn xanh (idempotent).
#
# CHỈ chọn tin của chính NTD demo: nếu chọn nhầm tin của NTD khác thì
# bước "NTD duyệt đơn" sẽ trả 403 (NTD demo không sở hữu đơn đó).
APPLIED_BODY=$(call GET "/student/applications" "$STUDENT_TOKEN")
APPLIED_IDS=$(printf '%s' "$APPLIED_BODY" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const list = JSON.parse(raw).data ?? [];
    process.stdout.write(list.map((a) => a.jobId).join(","));
  } catch { process.stdout.write(""); }
});
')

OWN_JOBS_BODY=$(call GET "/employer/jobs" "$EMPLOYER_TOKEN")
OWN_JOB_IDS=$(printf '%s' "$OWN_JOBS_BODY" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const list = JSON.parse(raw).data ?? [];
    process.stdout.write(list.map((j) => j.id).join(","));
  } catch { process.stdout.write(""); }
});
')

BODY=$(call GET "/jobs/public?page=1&pageSize=50")
JOB_ID=$(printf '%s' "$BODY" | node -e '
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const applied = new Set((process.argv[1] || "").split(",").filter(Boolean));
  const own = new Set((process.argv[2] || "").split(",").filter(Boolean));
  try {
    const items = JSON.parse(raw).data?.items ?? [];
    // Chỉ tin OPEN của NTD demo mà sinh viên chưa ứng tuyển.
    // `items` đến từ API public nên đã bao gồm cả tin PENDING_REVIEW/CLOSED
    // do các endpoint khác — lọc thêm status === "OPEN" cho chắc.
    const hit = items.find(
      (j) => own.has(j.id) && !applied.has(j.id) && j.status === "OPEN"
    );
    process.stdout.write(hit ? hit.id : "");
  } catch { process.stdout.write(""); }
});
' "$APPLIED_IDS" "$OWN_JOB_IDS")

if [ -z "$JOB_ID" ]; then
  # Không còn tin OPEN nào của NTD demo mà sinh viên chưa ứng tuyển.
  # BỎ QUA các bước ứng tuyển / duyệt đơn / đánh giá — không được chọn tin
  # của NTD khác vì NTD demo sẽ không có quyền duyệt đơn đó (403).
  ok "không còn tin OPEN của NTD demo chưa ứng tuyển — bỏ qua bước ứng tuyển/duyệt/đánh giá"
  SKIP_APPLY=1
else
  ok "chọn tin chưa ứng tuyển ($JOB_ID)"
  SKIP_APPLY=0
fi

if [ "$SKIP_APPLY" -eq 0 ]; then
APPLY_BODY=$(cat <<JSON
{"jobId":"$JOB_ID","coverLetter":"Tôi rất muốn ứng tuyển vị trí này.","expectedSalary":120000,"experience":"2 năm phục vụ quán cà phê","availableFrom":"2026-11-20"}
JSON
)
BODY=$(call POST "/student/applications" "$STUDENT_TOKEN" "$APPLY_BODY")
expect_status 201 "$(status)" "nộp đơn ứng tuyển"
APPLICATION_ID=$(jget "$BODY" "data.id")
[ -n "$APPLICATION_ID" ] && ok "nhận mã đơn ($APPLICATION_ID)" || fail "thiếu mã đơn ứng tuyển"

# Ứng tuyển trùng -> 400
BODY=$(call POST "/student/applications" "$STUDENT_TOKEN" "$APPLY_BODY")
expect_status 400 "$(status)" "ứng tuyển trùng bị từ chối"

# Xem danh sách đơn
BODY=$(call GET "/student/applications" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "GET /student/applications"

# =====================================================================
step "5. NTD duyệt đơn"
BODY=$(call GET "/employer/applications" "$EMPLOYER_TOKEN")
expect_status 200 "$(status)" "GET /employer/applications"

BODY=$(call PATCH "/employer/applications/$APPLICATION_ID" "$EMPLOYER_TOKEN" '{"status":"ACCEPTED","note":"Chào mừng bạn"}')
expect_status 200 "$(status)" "NTD chuyển đơn sang ACCEPTED"
expect_contains "$BODY" '"timeline"' "đơn có timeline"

BODY=$(call PATCH "/employer/applications/$APPLICATION_ID" "$EMPLOYER_TOKEN" '{"status":"COMPLETED"}')
expect_status 200 "$(status)" "NTD chuyển đơn sang COMPLETED"

# =====================================================================
step "6. Đánh giá 2 chiều"
BODY=$(call POST "/reviews" "$STUDENT_TOKEN" "{\"applicationId\":\"$APPLICATION_ID\",\"rating\":5,\"comment\":\"Công việc tuyệt vời, đồng nghiệp tốt!\"}")
expect_status 201 "$(status)" "sinh viên đánh giá NTD"

BODY=$(call POST "/reviews" "$EMPLOYER_TOKEN" "{\"applicationId\":\"$APPLICATION_ID\",\"rating\":4,\"comment\":\"Ứng viên nhiệt tình, làm việc chăm chỉ.\"}")
expect_status 201 "$(status)" "NTD đánh giá sinh viên"

# Đánh giá trùng -> 400
BODY=$(call POST "/reviews" "$STUDENT_TOKEN" "{\"applicationId\":\"$APPLICATION_ID\",\"rating\":3,\"comment\":\"Đánh giá lại\"}")
expect_status 400 "$(status)" "đánh giá trùng bị từ chối"

# Điểm trung bình đã cập nhật
BODY=$(call GET "/employer/profile" "$EMPLOYER_TOKEN")
expect_status 200 "$(status)" "GET /employer/profile"
expect_contains "$BODY" '"ratingCount"' "hồ sơ NTD có ratingCount"
fi   # end SKIP_APPLY

# =====================================================================
step "7. NTD đăng tin -> Admin duyệt"
NEW_JOB_BODY=$(cat <<JSON
{
  "title":"Nhân viên phục vụ part-time (Smoke Test)",
  "description":"Vị trí part-time dành cho sinh viên, ca 4 tiếng/ngày.",
  "requirements":["Nhanh nhẹn","Có kinh nghiệm làm thêm"],
  "benefits":["Đồ ăn ca","Lương tính theo giờ"],
  "category":{"id":"cat-fnb","name":"F&B"},
  "position":{"id":"pos-phuc-vu","name":"Phục vụ"},
  "employmentType":"PART_TIME",
  "workMode":"ONSITE",
  "salaryType":"HOURLY",
  "salaryMin":120000,
  "salaryMax":150000,
  "location":{"provinceId":"hcm","province":"TP. Hồ Chí Minh","districtId":"q1","district":"Quận 1","address":"123 Nguyễn Huệ","branchName":"Chi nhánh chính"},
  "positionsCount":2,
  "schedules":[{"dayOfWeek":1,"startTime":"09:00","endTime":"13:00"}],
  "skills":[{"id":"sk-service","name":"Phục vụ"}],
  "deadline":"2026-12-31T23:59:00"
}
JSON
)
BODY=$(call POST "/employer/jobs" "$EMPLOYER_TOKEN" "$NEW_JOB_BODY")
expect_status 201 "$(status)" "NTD đăng tin tuyển dụng"
NEW_JOB_ID=$(jget "$BODY" "data.id")
[ -n "$NEW_JOB_ID" ] && ok "nhận mã tin mới ($NEW_JOB_ID)" || fail "thiếu mã tin mới"

# Tin chờ duyệt -> chưa hiện ở API public
BODY=$(call GET "/jobs/public?pageSize=100")
expect_status 200 "$(status)" "GET /jobs/public (kiểm tra tin chờ duyệt bị ẩn)"
if printf '%s' "$BODY" | grep -q "$NEW_JOB_ID"; then
  fail "tin PENDING_REVIEW vẫn xuất hiện trong danh sách công khai"
else
  ok "tin PENDING_REVIEW bị ẩn khỏi danh sách công khai"
fi

# Admin duyệt
BODY=$(call PATCH "/admin/jobs/$NEW_JOB_ID/review" "$ADMIN_TOKEN" '{"action":"APPROVE"}')
expect_status 200 "$(status)" "Admin duyệt tin tuyển dụng"
expect_contains "$BODY" '"OPEN"' "tin chuyển sang OPEN"

# Sau khi duyệt -> hiện ở API public
BODY=$(call GET "/jobs/public?pageSize=100")
if printf '%s' "$BODY" | grep -q "$NEW_JOB_ID"; then
  ok "tin OPEN xuất hiện trong danh sách công khai"
else
  fail "tin OPEN không xuất hiện trong danh sách công khai"
fi

# =====================================================================
step "8. Admin quản lý người dùng & nhóm việc"
BODY=$(call GET "/admin/dashboard" "$ADMIN_TOKEN")
expect_status 200 "$(status)" "GET /admin/dashboard"
expect_contains "$BODY" '"totalUsers"' "dashboard có totalUsers"

BODY=$(call GET "/admin/users?role=STUDENT" "$ADMIN_TOKEN")
expect_status 200 "$(status)" "GET /admin/users"

BODY=$(call GET "/admin/categories" "$ADMIN_TOKEN")
expect_status 200 "$(status)" "GET /admin/categories"

BODY=$(call POST "/admin/categories" "$ADMIN_TOKEN" '{"name":"Smoke Test Category","description":"Nhóm việc tạm cho smoke test","icon":"Briefcase"}')
expect_status 201 "$(status)" "Admin tạo nhóm việc"
CAT_ID=$(jget "$BODY" "data.id")

BODY=$(call PUT "/admin/categories/$CAT_ID" "$ADMIN_TOKEN" '{"name":"Smoke Test Category Updated"}')
expect_status 200 "$(status)" "Admin cập nhật nhóm việc"

BODY=$(call DELETE "/admin/categories/$CAT_ID" "$ADMIN_TOKEN")
expect_status 200 "$(status)" "Admin xoá nhóm việc"

# =====================================================================
step "9. Tin đã lưu"
# Dùng một tin công khai bất kỳ (bước 4 có thể đã bỏ qua -> JOB_ID rỗng)
SAVED_JOB_ID="$JOB_ID"
if [ -z "$SAVED_JOB_ID" ]; then
  SAVED_JOB_ID=$(jget "$(call GET "/jobs/public?page=1&pageSize=1")" "data.items.0.id")
fi

BODY=$(call POST "/student/saved-jobs" "$STUDENT_TOKEN" "{\"jobId\":\"$SAVED_JOB_ID\"}")
expect_status 200 "$(status)" "sinh viên lưu tin"

BODY=$(call GET "/student/saved-jobs" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "GET /student/saved-jobs"

BODY=$(call DELETE "/student/saved-jobs/$SAVED_JOB_ID" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "sinh viên bỏ lưu tin"

# =====================================================================
step "10. Thông báo"
BODY=$(call GET "/notifications" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "GET /notifications"

BODY=$(call GET "/notifications/unread-count" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "GET /notifications/unread-count"
expect_contains "$BODY" '"count"' "unread-count có count"

BODY=$(call POST "/notifications/read-all" "$STUDENT_TOKEN" "")
expect_status 200 "$(status)" "POST /notifications/read-all"

# --- Vé kết nối WebSocket (realtime) ---
BODY=$(call POST "/ws/ticket" "$STUDENT_TOKEN" "")
expect_status 200 "$(status)" "POST /ws/ticket (sinh viên đã đăng nhập)"
WS_TICKET=$(jget "$BODY" "data.ticket")
[ -n "$WS_TICKET" ] && ok "nhận vé WebSocket" || fail "thiếu vé WebSocket"
expect_contains "$BODY" '"expiresIn"' "vé có expiresIn"

# Không token -> 401
BODY=$(call POST "/ws/ticket" "" "")
expect_status 401 "$(status)" "POST /ws/ticket không token trả 401"

# Vé sai -> handshake bị từ chối (HTTP 403)
WS_URL="${BASE_URL%/api/v1}"
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "$WS_URL/ws/notifications?ticket=invalid-ticket")
expect_status 403 "$WS_STATUS" "handshake với vé sai bị từ chối"

# =====================================================================
step "11. Hồ sơ sinh viên"
BODY=$(call GET "/student/profile" "$STUDENT_TOKEN")
expect_status 200 "$(status)" "GET /student/profile"
expect_contains "$BODY" '"jobPreferences"' "hồ sơ có jobPreferences"

BODY=$(call PUT "/student/profile" "$STUDENT_TOKEN" '{"bio":"Sinh viên năm 3, sẵn sàng làm thêm.","skills":["sk-service"]}')
expect_status 200 "$(status)" "PUT /student/profile"

# =====================================================================
step "12. Làm mới token"
REFRESH_BODY=$(call POST "/auth/login" "" '{"email":"student@viejob.vn","password":"Student@123"}')
REFRESH_TOKEN=$(jget "$REFRESH_BODY" "data.refreshToken")
if [ -n "$REFRESH_TOKEN" ]; then
  BODY=$(call POST "/auth/refresh" "" "{\"refresh_token\":\"$REFRESH_TOKEN\"}")
  expect_status 200 "$(status)" "POST /auth/refresh"
  expect_contains "$BODY" '"access_token"' "refresh trả access_token mới"
else
  fail "không nhận được refresh token khi đăng nhập"
fi

# =====================================================================
step "13. Phân quyền"
BODY=$(call GET "/admin/dashboard" "$STUDENT_TOKEN")
expect_status 403 "$(status)" "sinh viên không được gọi API admin"

BODY=$(call GET "/student/profile" "$EMPLOYER_TOKEN")
expect_status 403 "$(status)" "NTD không được gọi API sinh viên"

# =====================================================================
printf "\n${YELLOW}================================${NC}\n"
printf "  ${GREEN}PASS: %d${NC}   ${RED}FAIL: %d${NC}\n" "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf "\n  ${RED}Các bước lỗi:${NC}\n"
  for s in "${FAILED_STEPS[@]}"; do printf "   - %s\n" "$s"; done
  exit 1
fi
printf "  ${GREEN}✓ Toàn bộ smoke test đạt.${NC}\n"
exit 0
