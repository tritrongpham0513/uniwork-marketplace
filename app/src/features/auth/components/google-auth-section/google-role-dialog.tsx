import { useState } from "react";
import {
  Building,
  Building2,
  GraduationCap,
  RefreshCw,
  User,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmployerType, RegisterRoleType } from "../../types";

interface GoogleRoleDialogProps {
  open: boolean;
  email?: string;
  fullName?: string;
  defaultRole?: RegisterRoleType;
  defaultEmployerType?: EmployerType;
  isPending: boolean;
  onConfirm: (role: RegisterRoleType, employerType?: EmployerType) => void;
  onClose: () => void;
}

interface GoogleRoleDialogBodyProps {
  email?: string;
  fullName?: string;
  defaultRole: RegisterRoleType;
  defaultEmployerType: EmployerType;
  isPending: boolean;
  onConfirm: (role: RegisterRoleType, employerType?: EmployerType) => void;
  onClose: () => void;
}

function GoogleRoleDialogBody({
  email,
  fullName,
  defaultRole,
  defaultEmployerType,
  isPending,
  onConfirm,
  onClose,
}: GoogleRoleDialogBodyProps) {
  const [selectedRole, setSelectedRole] =
    useState<RegisterRoleType>(defaultRole);
  const [employerType, setEmployerType] =
    useState<EmployerType>(defaultEmployerType);

  const handleConfirm = () => {
    onConfirm(
      selectedRole,
      selectedRole === "EMPLOYER" ? employerType : undefined
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chọn vai trò trên VieJob</DialogTitle>
        <DialogDescription>
          {fullName ? (
            <>
              Chào mừng <strong className="text-foreground">{fullName}</strong>
              {email ? ` (${email})` : ""}! Hãy chọn vai trò để hoàn tất tạo tài
              khoản.
            </>
          ) : (
            <>
              Tài khoản Google{email ? ` (${email})` : ""} chưa được đăng ký.
              Hãy chọn vai trò để tiếp tục.
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setSelectedRole("STUDENT")}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all",
              selectedRole === "STUDENT"
                ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
            )}
          >
            <GraduationCap className="size-6 shrink-0" />
            <span className="text-sm font-semibold">Sinh viên</span>
            <span className="text-xs text-muted-foreground">
              Tìm việc làm part-time
            </span>
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setSelectedRole("EMPLOYER")}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all",
              selectedRole === "EMPLOYER"
                ? "border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20"
                : "border-border/80 bg-background/50 text-muted-foreground hover:border-border hover:bg-muted/50"
            )}
          >
            <Building2 className="size-6 shrink-0" />
            <span className="text-sm font-semibold">Nhà tuyển dụng</span>
            <span className="text-xs text-muted-foreground">
              Đăng tin tuyển dụng
            </span>
          </button>
        </div>

        {selectedRole === "EMPLOYER" && (
          <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-3">
            <span className="block text-xs font-medium text-foreground">
              Hình thức tuyển dụng:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setEmployerType("COMPANY")}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  employerType === "COMPANY"
                    ? "border-primary bg-background font-semibold text-primary shadow-2xs"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <Building className="size-3.5" />
                Doanh nghiệp
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setEmployerType("INDIVIDUAL")}
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  employerType === "INDIVIDUAL"
                    ? "border-primary bg-background font-semibold text-primary shadow-2xs"
                    : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <User className="size-3.5" />
                Cá nhân
              </button>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onClose}
          className="rounded-2xl"
        >
          Huỷ
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={handleConfirm}
          className="rounded-2xl font-semibold"
        >
          {isPending ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" />
              Đang hoàn tất...
            </>
          ) : (
            "Hoàn tất & Đăng nhập"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Hộp thoại chọn vai trò khi người dùng đăng nhập Google lần đầu
 * (email chưa từng tồn tại trên hệ thống).
 */
export function GoogleRoleDialog({
  open,
  email,
  fullName,
  defaultRole = "STUDENT",
  defaultEmployerType = "COMPANY",
  isPending,
  onConfirm,
  onClose,
}: GoogleRoleDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={!isPending} className="sm:max-w-md">
        {open && (
          <GoogleRoleDialogBody
            key={email ?? "pending-google-user"}
            email={email}
            fullName={fullName}
            defaultRole={defaultRole}
            defaultEmployerType={defaultEmployerType}
            isPending={isPending}
            onConfirm={onConfirm}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
