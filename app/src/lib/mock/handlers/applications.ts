import type {
  Application,
  ApplicationStatus,
  EmployerProfile,
  Job,
  Notification,
  Review,
  SavedJob,
  StudentProfile,
} from "@/features/shared/types";
import { getDb, nextId, nowIso } from "../db";
import { badRequest, forbidden, notFound } from "../errors";

// ============================================
// APPLICATION
// ============================================

export interface CreateApplicationBody {
  jobId: string;
  cvUrl?: string | null;
  cvFileName?: string | null;
  coverLetter?: string;
  expectedSalary?: number | null;
  experience?: string;
  availableFrom?: string | null;
}

export const applicationHandlers = {
  /**
   * POST /api/v1/student/applications — nộp đơn ứng tuyển.
   */
  create(body: CreateApplicationBody, userId: number): Application {
    const db = getDb();

    const job = db.jobs.find((j) => j.id === body.jobId);
    if (!job) throw notFound("Không tìm thấy tin tuyển dụng này.");
    if (job.status !== "OPEN") {
      throw badRequest("Tin tuyển dụng này đã ngừng nhận ứng tuyển.");
    }

    const profile = db.studentProfiles.find((p) => p.userId === userId);
    if (!profile) throw notFound("Không tìm thấy hồ sơ sinh viên.");

    const existing = db.applications.find(
      (a) => a.jobId === body.jobId && a.studentId === profile.id
    );
    if (existing) {
      throw badRequest("Bạn đã ứng tuyển vào tin tuyển dụng này rồi.");
    }

    const now = nowIso();
    const application: Application = {
      id: nextId("app"),
      jobId: job.id,
      jobTitle: job.title,
      employerId: job.employerId,
      employerName: job.employer.name,
      employerLogoVariant: job.employer.logoVariant,
      employerVerified: job.employer.verified,
      studentId: profile.id,
      studentName: profile.fullName,
      studentAvatarUrl: profile.avatarUrl,
      studentUniversity: profile.university,
      studentMajor: profile.major,
      studentYear: profile.yearOfStudy,
      studentPhone: profile.phone,
      studentEmail: db.users.find((u) => u.id === userId)?.email ?? "",
      studentSkills: [...profile.skills],
      studentBio: profile.bio,
      cvUrl: body.cvUrl ?? profile.cvUrl,
      cvFileName: body.cvFileName ?? null,
      coverLetter: body.coverLetter ?? "",
      expectedSalary: body.expectedSalary ?? null,
      experience: body.experience?.trim() ?? "",
      availableFrom: body.availableFrom ?? null,
      status: "PENDING",
      employerNote: null,
      timeline: [{ status: "PENDING", at: now, note: null }],
      createdAt: now,
      updatedAt: now,
    };

    db.applications.unshift(application);
    job.applicantCount += 1;

    // Tạo thông báo cho NTD
    db.notifications.unshift({
      id: nextId("ntf"),
      userId: employerUserId(db, job.employerId) ?? 0,
      type: "APPLICATION",
      title: "Có ứng viên mới ứng tuyển",
      body: `${profile.fullName} vừa ứng tuyển vào vị trí ${job.title}.`,
      isRead: false,
      link: `/employer/applications/${application.id}`,
      createdAt: now,
    });

    return application;
  },

  /**
   * GET /api/v1/student/applications — đơn ứng tuyển của sinh viên.
   */
  listByStudent(userId: number, status?: string): Application[] {
    const db = getDb();
    const profile = db.studentProfiles.find((p) => p.userId === userId);
    if (!profile) return [];

    return db.applications.filter((a) => {
      if (a.studentId !== profile.id) return false;
      if (status && status !== "ALL" && a.status !== status) return false;
      return true;
    });
  },

  /**
   * GET /api/v1/student/applications/{id}
   */
  detailForStudent(id: string, userId: number): Application {
    const db = getDb();
    const application = db.applications.find((a) => a.id === id);
    if (!application) throw notFound("Không tìm thấy đơn ứng tuyển.");

    const profile = db.studentProfiles.find((p) => p.userId === userId);
    if (!profile || application.studentId !== profile.id) {
      throw forbidden("Bạn không có quyền xem đơn ứng tuyển này.");
    }

    return application;
  },

  /**
   * PATCH /api/v1/student/applications/{id}/withdraw — rút đơn.
   */
  withdraw(id: string, userId: number): Application {
    const db = getDb();
    const application = db.applications.find((a) => a.id === id);
    if (!application) throw notFound("Không tìm thấy đơn ứng tuyển.");

    const profile = db.studentProfiles.find((p) => p.userId === userId);
    if (!profile || application.studentId !== profile.id) {
      throw forbidden("Bạn không có quyền thao tác đơn ứng tuyển này.");
    }

    if (application.status !== "PENDING" && application.status !== "VIEWED") {
      throw badRequest(
        "Đơn ứng tuyển đã được xử lý, không thể rút. Vui lòng liên hệ nhà tuyển dụng."
      );
    }

    return pushStatus(application, "WITHDRAWN", "Sinh viên đã rút đơn");
  },

  /**
   * GET /api/v1/employer/applications — danh sách ứng viên.
   */
  listByEmployer(
    employerId: string,
    query: { jobId?: string; status?: string }
  ): Application[] {
    const db = getDb();
    const employer = db.employerProfiles.find((e) => e.id === employerId);

    return db.applications.filter((a) => {
      const isMine = employer
        ? a.employerId === employerId
        : a.employerId === employerId;
      if (!isMine) return false;
      if (query.jobId && a.jobId !== query.jobId) return false;
      if (query.status && query.status !== "ALL" && a.status !== query.status) {
        return false;
      }
      return true;
    });
  },

  /**
   * GET /api/v1/employer/applications/{id}
   */
  detailForEmployer(id: string, employerId: string): Application {
    const application = getDb().applications.find((a) => a.id === id);
    if (!application) throw notFound("Không tìm thấy đơn ứng tuyển.");
    if (application.employerId !== employerId) {
      throw forbidden("Bạn không có quyền xem đơn ứng tuyển này.");
    }
    return application;
  },

  /**
   * PATCH /api/v1/employer/applications/{id} — đổi trạng thái đơn.
   */
  updateStatus(
    id: string,
    body: { status: ApplicationStatus; note?: string },
    employerId: string
  ): Application {
    const db = getDb();
    const application = db.applications.find((a) => a.id === id);
    if (!application) throw notFound("Không tìm thấy đơn ứng tuyển.");
    if (application.employerId !== employerId) {
      throw forbidden("Bạn không có quyền xử lý đơn ứng tuyển này.");
    }

    const noteMap: Partial<Record<ApplicationStatus, string>> = {
      VIEWED: "Nhà tuyển dụng đã xem hồ sơ",
      SHORTLISTED: "Được duyệt sơ bộ",
      ACCEPTED: "Đã nhận ứng viên",
      COMPLETED: "Công việc đã hoàn thành",
      REJECTED: "Không phù hợp",
    };

    const updated = pushStatus(
      application,
      body.status,
      body.note ?? noteMap[body.status] ?? null
    );

    // Đồng bộ số suất của tin tuyển dụng
    const job = db.jobs.find((j) => j.id === application.jobId);
    if (job) {
      const acceptedCount = db.applications.filter(
        (a) => a.jobId === job.id && a.status === "ACCEPTED"
      ).length;
      job.positionsFilled = Math.min(acceptedCount, job.positionsCount);
      if (acceptedCount >= job.positionsCount && job.status === "OPEN") {
        job.status = "FILLED";
      }
    }

    // Thông báo cho sinh viên
    const studentUser = db.users.find((u) => {
      const profile = db.studentProfiles.find(
        (p) => p.id === application.studentId
      );
      return profile ? u.id === profile.userId : false;
    });

    if (studentUser) {
      db.notifications.unshift({
        id: nextId("ntf"),
        userId: studentUser.id,
        type: "APPLICATION_STATUS",
        title: `Cập nhật đơn ứng tuyển: ${application.jobTitle}`,
        body:
          body.note ??
          `Trạng thái đơn ứng tuyển của bạn đã được cập nhật thành "${statusLabel(body.status)}".`,
        isRead: false,
        link: `/student/applications/${application.id}`,
        createdAt: nowIso(),
      });
    }

    return updated;
  },
};

// ============================================
// REVIEW
// ============================================

export interface CreateReviewBody {
  applicationId: string;
  rating: number;
  comment: string;
}

export const reviewHandlers = {
  /**
   * POST /api/v1/reviews — tạo đánh giá 2 chiều.
   */
  create(body: CreateReviewBody, userId: number, role: string): Review {
    const db = getDb();

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      throw badRequest("Vui lòng chấm điểm từ 1 đến 5 sao.", [
        { field: "rating", message: "Điểm đánh giá không hợp lệ" },
      ]);
    }

    if (!body.comment?.trim()) {
      throw badRequest("Vui lòng viết nhận xét.", [
        { field: "comment", message: "Nhận xét không được để trống" },
      ]);
    }

    const application = db.applications.find((a) => a.id === body.applicationId);
    if (!application) throw notFound("Không tìm thấy đơn ứng tuyển.");

    if (application.status !== "COMPLETED") {
      throw badRequest(
        "Chỉ được đánh giá sau khi công việc đã hoàn thành."
      );
    }

    const isStudent = role === "STUDENT";
    const profile = isStudent
      ? db.studentProfiles.find((p) => p.userId === userId)
      : db.employerProfiles.find((p) => p.userId === userId);

    if (!profile) throw notFound("Không tìm thấy hồ sơ.");

    const fromName = isStudent
      ? (profile as StudentProfile).fullName
      : (profile as EmployerProfile).displayName;
    const fromAvatarUrl = isStudent
      ? (profile as StudentProfile).avatarUrl
      : null;

    // Kiểm tra đã đánh giá chưa
    const alreadyReviewed = db.reviews.some(
      (r) =>
        r.applicationId === body.applicationId &&
        r.fromUserId === userId
    );
    if (alreadyReviewed) {
      throw badRequest("Bạn đã đánh giá công việc này rồi.");
    }

    const targetIsEmployer = isStudent;
    const target = targetIsEmployer
      ? db.employerProfiles.find((e) => e.id === application.employerId)
      : db.studentProfiles.find((s) => s.id === application.studentId);

    const targetName = targetIsEmployer
      ? (target as EmployerProfile | undefined)?.displayName ?? ""
      : (target as StudentProfile | undefined)?.fullName ?? "";

    const now = nowIso();
    const review: Review = {
      id: nextId("rev"),
      jobId: application.jobId,
      jobTitle: application.jobTitle,
      applicationId: application.id,
      fromUserId: userId,
      fromRole: isStudent ? "STUDENT" : "EMPLOYER",
      fromName,
      fromAvatarUrl,
      targetType: targetIsEmployer ? "EMPLOYER" : "STUDENT",
      targetUserId: target?.userId ?? 0,
      targetName,
      rating: body.rating,
      comment: body.comment.trim(),
      reply: null,
      isHidden: false,
      createdAt: now,
    };

    db.reviews.unshift(review);

    // Cập nhật điểm trung bình
    if (target && "avgRating" in target && "ratingCount" in target) {
      const count = target.ratingCount + 1;
      target.avgRating = Number(
        ((target.avgRating * target.ratingCount + body.rating) / count).toFixed(1)
      );
      target.ratingCount = count;
    }

    return review;
  },

  /**
   * GET /api/v1/reviews?targetType=&targetUserId=
   */
  list(query: {
    targetType?: string;
    targetUserId?: string;
    targetName?: string;
    hideHidden?: boolean;
  }): Review[] {
    const db = getDb();

    return db.reviews.filter((r) => {
      if (query.hideHidden && r.isHidden) return false;
      if (query.targetType && r.targetType !== query.targetType) return false;
      if (
        query.targetUserId &&
        String(r.targetUserId) !== String(query.targetUserId)
      ) {
        return false;
      }
      return true;
    });
  },

  /**
   * PATCH /api/v1/employer/reviews/{id}/reply — trả lời đánh giá.
   */
  reply(id: string, reply: string, _employerId: string): Review {
    const db = getDb();
    const review = db.reviews.find((r) => r.id === id);
    if (!review) throw notFound("Không tìm thấy đánh giá.");
    review.reply = reply.trim() || null;
    return review;
  },

  /**
   * PATCH /api/v1/admin/reviews/{id} — ẩn/hiện đánh giá.
   */
  setHidden(id: string, isHidden: boolean): Review {
    const db = getDb();
    const review = db.reviews.find((r) => r.id === id);
    if (!review) throw notFound("Không tìm thấy đánh giá.");
    review.isHidden = isHidden;
    return review;
  },
};

// ============================================
// NOTIFICATION
// ============================================

export const notificationHandlers = {
  /**
   * GET /api/v1/notifications
   */
  list(userId: number, unreadOnly?: string): Notification[] {
    const db = getDb();
    return db.notifications.filter((n) => {
      if (n.userId !== userId) return false;
      if (unreadOnly === "true" && n.isRead) return false;
      return true;
    });
  },

  /**
   * GET /api/v1/notifications/unread-count
   */
  unreadCount(userId: number): number {
    return getDb().notifications.filter(
      (n) => n.userId === userId && !n.isRead
    ).length;
  },

  /**
   * PATCH /api/v1/notifications/{id}/read
   */
  markRead(id: string, userId: number): Notification {
    const db = getDb();
    const notification = db.notifications.find(
      (n) => n.id === id && n.userId === userId
    );
    if (!notification) throw notFound("Không tìm thấy thông báo.");
    notification.isRead = true;
    return notification;
  },

  /**
   * POST /api/v1/notifications/read-all
   */
  markAllRead(userId: number): number {
    const db = getDb();
    let count = 0;
    for (const n of db.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        count += 1;
      }
    }
    return count;
  },
};

// ============================================
// PROFILE
// ============================================

export const profileHandlers = {
  /**
   * GET /api/v1/student/profile
   */
  getStudent(userId: number): StudentProfile {
    const profile = getDb().studentProfiles.find((p) => p.userId === userId);
    if (!profile) throw notFound("Không tìm thấy hồ sơ sinh viên.");
    return profile;
  },

  /**
   * PUT /api/v1/student/profile
   */
  updateStudent(userId: number, body: Partial<StudentProfile>): StudentProfile {
    const db = getDb();
    const index = db.studentProfiles.findIndex((p) => p.userId === userId);
    if (index === -1) throw notFound("Không tìm thấy hồ sơ sinh viên.");

    const current = db.studentProfiles[index];
    const updated: StudentProfile = {
      ...current,
      ...body,
      id: current.id,
      userId: current.userId,
      jobPreferences: { ...current.jobPreferences, ...(body.jobPreferences ?? {}) },
    };
    db.studentProfiles[index] = updated;

    // Đồng bộ tên hiển thị trên user
    const user = db.users.find((u) => u.id === userId);
    if (user && body.fullName) user.fullName = body.fullName;

    return updated;
  },

  /**
   * GET /api/v1/employer/profile — hồ sơ NTD của chính người đang đăng nhập.
   */
  getEmployer(userId: number): EmployerProfile {
    const profile = getDb().employerProfiles.find((p) => p.userId === userId);
    if (!profile) throw notFound("Không tìm thấy hồ sơ nhà tuyển dụng.");
    return profile;
  },

  /**
   * GET /api/v1/public/employers/{id} — hồ sơ NTD công khai (xem được bởi mọi vai trò).
   */
  getEmployerPublic(employerId: string): {
    profile: EmployerProfile;
    jobs: Job[];
    reviews: Review[];
  } {
    const db = getDb();
    const profile = db.employerProfiles.find((p) => p.id === employerId);
    if (!profile) throw notFound("Không tìm thấy nhà tuyển dụng này.");

    const jobs = db.jobs.filter(
      (j) => j.employerId === employerId && j.status === "OPEN"
    );

    const reviews = db.reviews.filter(
      (r) =>
        r.targetType === "EMPLOYER" &&
        r.targetUserId === profile.userId &&
        !r.isHidden
    );

    return { profile, jobs, reviews };
  },

  /**
   * PUT /api/v1/employer/profile
   */
  updateEmployer(
    userId: number,
    body: Partial<EmployerProfile>
  ): EmployerProfile {
    const db = getDb();
    const index = db.employerProfiles.findIndex((p) => p.userId === userId);
    if (index === -1) throw notFound("Không tìm thấy hồ sơ nhà tuyển dụng.");

    const current = db.employerProfiles[index];
    const updated: EmployerProfile = { ...current, ...body, id: current.id, userId: current.userId };
    db.employerProfiles[index] = updated;

    const user = db.users.find((u) => u.id === userId);
    if (user && body.displayName) user.fullName = body.displayName;

    // Đồng bộ tên hiển thị trên các tin đã đăng
    for (const job of db.jobs) {
      if (job.employerId === current.id) {
        job.employer = { ...job.employer, name: updated.displayName };
      }
    }

    return updated;
  },
};

// ============================================
// SAVED JOBS
// ============================================

export const savedJobHandlers = {
  /**
   * GET /api/v1/student/saved-jobs
   */
  list(userId: number): SavedJob[] {
    return getDb().savedJobs.filter((s) => s.userId === userId);
  },

  /**
   * POST /api/v1/student/saved-jobs — lưu tin
   */
  save(jobId: string, userId: number): SavedJob {
    const db = getDb();
    if (!db.jobs.find((j) => j.id === jobId)) {
      throw notFound("Không tìm thấy tin tuyển dụng này.");
    }

    const existing = db.savedJobs.find(
      (s) => s.jobId === jobId && s.userId === userId
    );
    if (existing) return existing;

    const saved: SavedJob = {
      id: nextId("saved"),
      jobId,
      userId,
      createdAt: nowIso(),
    };
    db.savedJobs.push(saved);
    return saved;
  },

  /**
   * DELETE /api/v1/student/saved-jobs/{jobId} — bỏ lưu tin
   */
  remove(jobId: string, userId: number): void {
    const db = getDb();
    const index = db.savedJobs.findIndex(
      (s) => s.jobId === jobId && s.userId === userId
    );
    if (index !== -1) db.savedJobs.splice(index, 1);
  },

  /**
   * GET /api/v1/student/saved-jobs/ids — danh sách id đã lưu
   */
  ids(userId: number): string[] {
    return getDb()
      .savedJobs.filter((s) => s.userId === userId)
      .map((s) => s.jobId);
  },
};

// ============================================
// HELPERS
// ============================================

/** Ghi thêm 1 bước vào timeline & cập nhật trạng thái */
const pushStatus = (
  application: Application,
  status: ApplicationStatus,
  note: string | null
): Application => {
  const now = nowIso();
  application.status = status;
  application.updatedAt = now;
  application.timeline.push({ status, at: now, note });
  if (note && status === "REJECTED") application.employerNote = note;
  return application;
};

/** Tìm userId của nhà tuyển dụng theo employerId */
const employerUserId = (
  db: ReturnType<typeof getDb>,
  employerId: string
): number | null =>
  db.employerProfiles.find((e) => e.id === employerId)?.userId ?? null;

/** Label trạng thái (nội bộ) */
const statusLabel = (status: ApplicationStatus): string => {
  const map: Record<ApplicationStatus, string> = {
    PENDING: "Đang chờ",
    VIEWED: "Đã xem hồ sơ",
    SHORTLISTED: "Được duyệt sơ bộ",
    ACCEPTED: "Đã nhận",
    COMPLETED: "Hoàn thành",
    REJECTED: "Không phù hợp",
    WITHDRAWN: "Đã rút",
  };
  return map[status];
};
