# ---------------------------------------------------------------------
# VieJob Marketplace — DỮ LIỆU DEMO "NHƯ APP THẬT"
#
# File seed ĐỘC LẬP, hoàn chỉnh, chạy bằng lệnh riêng:
#
#     ./seed/seed-demo.sh              # seed vào DB dev (docker-compose.dev.yml)
#     ./seed/seed-demo.sh --prod       # seed vào DB production (docker-compose.yml)
#     ./seed/seed-demo.sh --host 127.0.0.1 --port 3306 --password secret
#
# Dùng khi nào?
#   - Muốn quay video demo: 1 lệnh là có nguyên dữ liệu "đẹp" như production.
#   - Muốn reset về trạng thái sạch để quay lại từ đầu.
#
# Khi nào KHÔNG cần?
#   - Khi lập trình tính năng mới (dev dùng DB riêng, seed V3/V7/V9 của
#     Flyway là đủ).
#   - Khi chạy CI/CD hay deploy thật (Flyway lo).
#
# Nguyên tắc:
#   - Idempotent: chạy lại nhiều lần cho cùng kết quả (xoá dữ liệu demo
#     cũ rồi nạp lại) → an toàn để quay video nhiều lần.
#   - Không đụng dữ liệu "thật" của người dùng: chỉ xoá các bản ghi có
#     slug / email thuộc prefix `demo-` hoặc domain `viejob.demo`.
#   - Master data (tỉnh, quận, nhóm việc, vị trí, kỹ năng) do Flyway lo —
#     file này chỉ tham chiếu, không tạo lại.
# ---------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

# --- Cấu hình mặc định ------------------------------------------------
COMPOSE_FILE="docker-compose.dev.yml"
DB_CONTAINER="viejob-mysql-dev"
DB_NAME="parttime_marketplace"
DB_USER="root"
DB_PASS="root"
SEED_FILE="seed/demo_seed.sql"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      COMPOSE_FILE="docker-compose.yml"
      DB_CONTAINER="viejob-mysql"
      shift
      ;;
    --host)   DB_HOST="$2"; shift 2 ;;
    --port)   DB_PORT="$2"; shift 2 ;;
    --user)   DB_USER="$2"; shift 2 ;;
    --password) DB_PASS="$2"; shift 2 ;;
    --file)   SEED_FILE="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Tham số không hợp lệ: $1" >&2; exit 1 ;;
  esac
done

# Nếu có --host/--port thì dùng mysql client trực tiếp (không cần docker).
if [[ -n "${DB_HOST:-}" ]]; then
  echo "→ Seed demo bằng mysql client tới ${DB_HOST}:${DB_PORT:-3306}/${DB_NAME}"
  mysql --default-character-set=utf8mb4 \
        -h "$DB_HOST" -P "${DB_PORT:-3306}" \
        -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SEED_FILE"
  echo "✓ Xong. Dữ liệu demo đã sẵn sàng."
  exit 0
fi

# Mặc định: chạy trong container MySQL của docker compose.
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  echo "✗ Không tìm thấy container '$DB_CONTAINER'." >&2
  echo "  Khởi động trước: docker compose -f $COMPOSE_FILE up -d mysql" >&2
  exit 1
fi

echo "→ Nạp dữ liệu demo vào '$DB_CONTAINER' (db=$DB_NAME)..."
echo "   Nguồn: $SEED_FILE"

docker exec -i "$DB_CONTAINER" \
  mysql --default-character-set=utf8mb4 \
        -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SEED_FILE"

echo ""
echo "✓ Xong! Dữ liệu demo đã sẵn sàng."
echo ""
echo "  Tài khoản đăng nhập:"
echo "    Sinh viên    : student@viejob.vn    / Student@123"
echo "    Sinh viên 2  : hoa.nguyen@sv.edu.vn / Student@123"
echo "    Nhà tuyển dụng: employer@viejob.vn   / Employer@123"
echo "    Nhà tuyển dụng 2: quan.lym@viejob.demo / Employer@123"
echo "    Quản trị viên : admin@viejob.vn      / Admin@123"
echo ""
echo "  (Mọi tài khoản demo khác dùng chung mật khẩu theo vai trò.)"
