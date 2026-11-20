import { useQuery } from "@tanstack/react-query";
import type { WorkHistory } from "@/features/shared/types";
import { workHistoryService } from "../services/work-history.service";

export const WORK_HISTORY_KEYS = {
  all: ["work-history"] as const,
  student: () => [...WORK_HISTORY_KEYS.all, "student"] as const,
  application: (applicationId: string) =>
    [...WORK_HISTORY_KEYS.all, "application", applicationId] as const,
};

/**
 * Kinh nghiệm làm việc của ứng viên trong 1 đơn ứng tuyển (phía nhà tuyển dụng).
 *
 * <p>Được gọi tự động khi đơn ứng tuyển chuyển sang `COMPLETED` — lúc đó
 * hệ thống tự ghi thêm 1 mục kinh nghiệm làm việc.
 */
export const useApplicationWorkHistory = (applicationId: string) =>
  useQuery({
    queryKey: WORK_HISTORY_KEYS.application(applicationId),
    queryFn: async () => {
      const response = await workHistoryService.listForApplication(applicationId);
      return response.data;
    },
    enabled: Boolean(applicationId),
  });

/** Lịch sử làm việc của sinh viên đang đăng nhập. */
export const useStudentWorkHistory = () =>
  useQuery({
    queryKey: WORK_HISTORY_KEYS.student(),
    queryFn: async () => {
      const response = await workHistoryService.listForStudent();
      return response.data;
    },
  });

export type { WorkHistory };
