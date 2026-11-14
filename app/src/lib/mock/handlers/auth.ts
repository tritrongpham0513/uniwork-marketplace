import type {
  AuthResponse,
  GoogleAuthResponse,
  LoginRequest,
  RegisterRequest,
  ResendVerificationRequest,
  UserSummaryResponse,
  VerifyEmailRequest,
} from "@/features/auth/types";
import { getDb, nextId, nextNumericId, nowIso } from "../db";
import { badRequest, conflict, unauthorized } from "../errors";
import { MOCK_EMPLOYER_PROFILES, toUserSummary } from "@/mocks/users";
import type { MockUser } from "@/mocks/users";

// ============================================
// TOKEN GIẢ — dạng JWT 3 phần để giống backend
// ============================================

const fakeJwt = (userId: number, role: string): string => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: String(userId),
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  return `${header}.${payload}.mock-signature`;
};

/** Đọc userId từ Bearer token */
export const resolveUserId = (
  authorization: string | undefined | null
): number | null => {
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload)) as { sub?: string };
    const id = Number(decoded.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
};

const buildAuthResponse = (user: MockUser): AuthResponse => ({
  accessToken: fakeJwt(user.id, user.role),
  tokenType: "Bearer",
  expiresIn: 86400,
  user: toUserSummary(user),
});

// ============================================
// HANDLERS
// ============================================

export const authHandlers = {
  /**
   * POST /api/v1/auth/register
   */
  register(body: RegisterRequest) {
    const db = getDb();
    const email = body.email?.trim().toLowerCase();

    if (!email || !body.password || !body.fullName) {
      throw badRequest("Dữ liệu đăng ký không hợp lệ.", [
        { field: "email", message: "Email không hợp lệ" },
        { field: "password", message: "Mật khẩu không được để trống" },
      ]);
    }

    if (db.users.some((u) => u.email === email)) {
      throw conflict("Email này đã được đăng ký. Vui lòng đăng nhập.", "EMAIL_EXISTS");
    }

    const user: MockUser = {
      id: nextNumericId(),
      email,
      password: body.password,
      role: body.role,
      fullName: body.fullName.trim(),
      status: "PENDING_VERIFY",
      phone: "",
      isLocked: false,
      joinedAt: nowIso(),
      lastLoginAt: null,
    };

    db.users.push(user);

    // Tạo hồ sơ phụ theo vai trò
    if (body.role === "STUDENT") {
      db.studentProfiles.push({
        id: nextId("stu"),
        userId: user.id,
        fullName: user.fullName,
        phone: "",
        dateOfBirth: null,
        gender: null,
        studentCode: "",
        university: "",
        major: "",
        yearOfStudy: null,
        provinceId: null,
        address: "",
        bio: "",
        avatarUrl: null,
        cvUrl: null,
        skills: [],
        experiences: [],
        jobPreferences: {
          categoryIds: [],
          employmentTypes: ["PART_TIME"],
          salaryMin: 0,
          salaryMax: 0,
          provinceIds: [],
        },
        avgRating: 0,
        ratingCount: 0,
        createdAt: nowIso(),
      });
    } else {
      db.employerProfiles.push({
        id: nextId("emp"),
        userId: user.id,
        employerType: body.employerType ?? "COMPANY",
        displayName: user.fullName,
        contactName: user.fullName,
        contactPhone: "",
        taxCode: null,
        description: "",
        logoUrl: null,
        website: null,
        provinceId: null,
        address: "",
        isVerified: false,
        avgRating: 0,
        ratingCount: 0,
        createdAt: nowIso(),
      });
    }

    return null;
  },

  /**
   * POST /api/v1/auth/login
   *
   * Mock:
   *   - Tài khoản có sẵn (seed data) → kiểm tra đúng mật khẩu, sai thì trả 401
   *     (giống hành vi thật của backend).
   *   - Email lạ → tự tạo tài khoản demo, vai trò suy ra từ tiền tố email
   *     (tiện cho việc trình bày). Xem `DEMO_ACCOUNTS`.
   */
  login(body: LoginRequest) {
    const db = getDb();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      throw badRequest("Vui lòng nhập email và mật khẩu.", [
        { field: "email", message: "Email không hợp lệ" },
        { field: "password", message: "Mật khẩu không được để trống" },
      ]);
    }

    let user = db.users.find((u) => u.email === email);

    // Tạo tài khoản demo nếu email chưa tồn tại (để demo mượt)
    if (!user) {
      const role = guessRoleFromEmail(email);
      const newUser: MockUser = {
        id: nextNumericId(),
        email,
        password,
        role,
        fullName: guessNameFromEmail(email),
        status: "ACTIVE",
        phone: "0900 000 000",
        isLocked: false,
        joinedAt: nowIso(),
        lastLoginAt: null,
      };
      db.users.push(newUser);
      user = newUser;
    }

    if (user.isLocked) {
      throw unauthorized(
        "Tài khoản đang bị khoá. Vui lòng liên hệ hỗ trợ để được mở khoá."
      );
    }

    // Tài khoản seed có mật khẩu cố định → sai mật khẩu thì báo 401
    if (user.password !== password) {
      throw unauthorized(
        "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
      );
    }

    user.lastLoginAt = nowIso();

    return buildAuthResponse(user);
  },

  /**
   * POST /api/v1/auth/google
   */
  googleLogin(body: { idToken?: string; role?: "STUDENT" | "EMPLOYER" }) {
    const db = getDb();

    if (!body.idToken) {
      throw badRequest("Thiếu Google ID token.", [
        { field: "idToken", message: "Không nhận được token từ Google" },
      ]);
    }

    const email = "google.user@gmail.com";
    const existing = db.users.find((u) => u.email === email);

    if (!existing && !body.role) {
      const response: GoogleAuthResponse = {
        needsRole: true,
        email,
        fullName: "Người dùng Google",
      };
      return response;
    }

    let user: MockUser;

    if (existing) {
      user = existing;
    } else {
      user = {
        id: nextNumericId(),
        email,
        password: "google-oauth",
        role: body.role ?? "STUDENT",
        fullName: "Người dùng Google",
        status: "ACTIVE",
        phone: "",
        isLocked: false,
        joinedAt: nowIso(),
        lastLoginAt: null,
      };
      db.users.push(user);
    }

    return buildAuthResponse(user);
  },

  /**
   * POST /api/v1/auth/verify-email
   */
  verifyEmail(body: VerifyEmailRequest) {
    if (!body.token) {
      throw badRequest("Thiếu mã xác thực.", [
        { field: "token", message: "Mã xác thực không hợp lệ" },
      ]);
    }
    const db = getDb();
    for (const user of db.users) {
      if (user.status === "PENDING_VERIFY") {
        user.status = "ACTIVE";
        break;
      }
    }
    return null;
  },

  /**
   * POST /api/v1/auth/resend-verification
   */
  resendVerification(body: ResendVerificationRequest) {
    if (!body.email) {
      throw badRequest("Vui lòng nhập email.", [
        { field: "email", message: "Email không hợp lệ" },
      ]);
    }
    return null;
  },

  /**
   * POST /api/v1/auth/refresh
   */
  refresh(refreshToken: string) {
    const db = getDb();
    const user = db.users[0];
    if (!user) throw unauthorized("Không tìm thấy phiên đăng nhập.");

    return {
      access_token: fakeJwt(user.id, user.role),
      refresh_token: refreshToken,
    };
  },

  /**
   * GET /api/v1/auth/me
   */
  me(userId: number | null): UserSummaryResponse {
    if (!userId) throw unauthorized();
    const user = getDb().users.find((u) => u.id === userId);
    if (!user) throw unauthorized();
    return toUserSummary(user);
  },
};

// ============================================
// HELPERS
// ============================================

/** Suy ra vai trò từ email demo để thuận tiện khi trình bày */
const guessRoleFromEmail = (email: string): MockUser["role"] => {
  if (email.startsWith("admin")) return "ADMIN";
  if (email.startsWith("employer") || email.startsWith("company")) return "EMPLOYER";
  return "STUDENT";
};

const guessNameFromEmail = (email: string): string => {
  const local = email.split("@")[0] ?? "user";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

/** Tài khoản demo hiển thị trên form đăng nhập */
export const DEMO_ACCOUNTS = [
  { email: "student@viejob.vn", password: "Student@123", role: "Sinh viên" },
  { email: "employer@viejob.vn", password: "Employer@123", role: "Nhà tuyển dụng" },
  { email: "admin@viejob.vn", password: "Admin@123", role: "Quản trị viên" },
] as const;

/** Re-export để router dùng */
export { MOCK_EMPLOYER_PROFILES };
