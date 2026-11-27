import {
  isJobRecruiting,
  type Job,
  type JobStatus,
} from "@/features/shared/types";
import type { EmployerJobStatusAction } from "../services/employer-jobs.service";

/** Tin tuyển dụng đang tuyển công khai mới được đóng thủ công. */
export const canCloseJob = (status: JobStatus): boolean =>
  isJobRecruiting(status);

/** Tin đã đóng chỉ mở lại được khi số suất đã nhận chưa đạt giới hạn. */
export const canReopenJob = (
  job: Pick<Job, "status" | "positionsFilled" | "positionsCount">
): boolean =>
  job.status === "CLOSED" && job.positionsFilled < job.positionsCount;

/** Tin đang tuyển, đã nhận đủ người hoặc đã đóng đều có thể đánh dấu hoàn thành. */
export const canCompleteJob = (status: JobStatus): boolean =>
  isJobRecruiting(status) || status === "FILLED" || status === "CLOSED";

export interface JobStatusConfirmMeta {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
}

/** Nội dung hộp thoại xác nhận cho từng thao tác chuyển trạng thái của nhà tuyển dụng. */
export const getJobStatusConfirmMeta = (
  job: Pick<Job, "title" | "positionsFilled" | "positionsCount">,
  action: EmployerJobStatusAction
): JobStatusConfirmMeta => {
  switch (action) {
    case "CLOSED":
      return {
        title: "Đóng tin tuyển dụng?",
        description: `Tin "${job.title}" sẽ ngừng hiển thị công khai và không nhận thêm đơn ứng tuyển mới. Các đơn ứng tuyển hiện có vẫn được xử lý bình thường và bạn có thể mở lại tin sau.`,
        confirmLabel: "Đóng tin",
        destructive: false,
      };
    case "OPEN":
      return {
        title: "Mở lại tin tuyển dụng?",
        description:
          job.positionsFilled > 0
            ? `Tin "${job.title}" hiện đã nhận ${job.positionsFilled}/${job.positionsCount} suất, nên sẽ được mở lại ở trạng thái "Đang tuyển thêm".`
            : `Tin "${job.title}" sẽ chuyển về trạng thái "Đang tuyển" và hiển thị trở lại trên tìm kiếm công khai.`,
        confirmLabel: "Mở lại tin",
        destructive: false,
      };
    case "COMPLETED":
      return {
        title: "Đánh dấu hoàn thành tin?",
        description: `Tin "${job.title}" sẽ chuyển sang trạng thái "Hoàn thành" và đóng tuyển dụng. Thao tác này yêu cầu không còn đơn ứng tuyển nào đang ở trạng thái "Đã nhận".`,
        confirmLabel: "Hoàn thành tin",
        destructive: false,
      };
  }
};

/** Thông báo thành công tương ứng trạng thái tin sau khi cập nhật. */
export const getJobStatusSuccessMessage = (
  action: EmployerJobStatusAction,
  updatedStatus: JobStatus
): string => {
  switch (action) {
    case "CLOSED":
      return "Đã đóng tin tuyển dụng.";
    case "OPEN":
      return updatedStatus === "IN_PROGRESS"
        ? "Đã mở lại tin ở trạng thái Đang tuyển thêm."
        : "Đã mở lại tin tuyển dụng.";
    case "COMPLETED":
      return "Đã đánh dấu hoàn thành tin tuyển dụng.";
  }
};
