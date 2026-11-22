import { useMemo, useState } from "react";
import { Lock, Search, ShieldCheck, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAdminUsers, useUpdateUser } from "@/features/admin/hooks";
import type { AdminUser, RoleType } from "@/features/shared/types";

import { showApiError, toast } from "@/lib/toast";

const ROLE_FILTERS: Array<{ value: RoleType | "ALL"; label: string }> = [
  { value: "ALL", label: "Tất cả vai trò" },
  { value: "STUDENT", label: "Sinh viên" },
  { value: "EMPLOYER", label: "Nhà tuyển dụng" },
  { value: "ADMIN", label: "Quản trị viên" },
];

const ROLE_LABELS: Record<RoleType, string> = {
  STUDENT: "Sinh viên",
  EMPLOYER: "Nhà tuyển dụng",
  ADMIN: "Quản trị viên",
};

const STATUS_LABELS: Record<AdminUser["status"], string> = {
  ACTIVE: "Hoạt động",
  PENDING_VERIFY: "Chờ xác thực",
  LOCKED: "Đã khoá",
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
};

export default function AdminUsersPage() {
  const [role, setRole] = useState<RoleType | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [nextRole, setNextRole] = useState<RoleType>("STUDENT");

  const { data: users = [], isPending, isError, refetch } = useAdminUsers(
    role,
    keyword
  );
  const updateUser = useUpdateUser();

  const lockedCount = useMemo(
    () => users.filter((user) => user.isLocked).length,
    [users]
  );

  const handleToggleLock = async (user: AdminUser) => {
    try {
      await updateUser.mutateAsync({
        id: String(user.id),
        payload: { isLocked: !user.isLocked },
      });
      toast.success(
        user.isLocked
          ? "Đã mở khoá tài khoản."
          : "Đã khoá tài khoản.",
        {
          description: user.isLocked
            ? `${user.fullName} có thể đăng nhập lại.`
            : `${user.fullName} sẽ không thể đăng nhập.`,
        }
      );
    } catch (error) {
      showApiError(error);
    }
  };

  const handleChangeRole = async () => {
    if (!roleTarget) return;
    try {
      await updateUser.mutateAsync({
        id: String(roleTarget.id),
        payload: { role: nextRole },
      });
      toast.success("Đã cập nhật vai trò người dùng.", {
        description: `${roleTarget.fullName} → ${ROLE_LABELS[nextRole]}`,
      });
      setRoleTarget(null);
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <DashboardLayout
      title="Quản lý người dùng"
      description="Theo dõi, khoá tài khoản và điều chỉnh vai trò người dùng."
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">Bộ lọc</CardTitle>
          <CardDescription>
            {users.length} tài khoản
            {lockedCount > 0 && ` · ${lockedCount} tài khoản đang bị khoá`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên hoặc email"
              className="pl-9"
            />
          </div>

          <Select
            value={role}
            onValueChange={(value) => setRole(value as RoleType | "ALL")}
            items={ROLE_FILTERS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="mt-4">
        {isPending && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            title="Không tải được danh sách người dùng"
            onRetry={() => void refetch()}
          />
        )}

        {!isPending && !isError && users.length === 0 && (
          <EmptyState
            icon="search"
            title="Không tìm thấy người dùng"
            description="Thử đổi bộ lọc hoặc tìm kiếm với từ khoá khác."
          />
        )}

        {!isPending && !isError && users.length > 0 && (
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Đơn</TableHead>
                      <TableHead className="text-right">Tin đăng</TableHead>
                      <TableHead>Ngày tham gia</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={user.fullName}
                              imageUrl={user.avatarUrl}
                              size="sm"
                              className="bg-primary/10 text-primary"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {user.fullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {user.email}
                              </p>
                              {(user.university || user.companyName) && (
                                <p className="truncate text-xs text-muted-foreground/80">
                                  {user.university ?? user.companyName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "ADMIN" ? "default" : "secondary"
                            }
                          >
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.isLocked
                                ? "destructive"
                                : user.status === "PENDING_VERIFY"
                                  ? "outline"
                                  : "secondary"
                            }
                          >
                            {user.isLocked
                              ? "Đã khoá"
                              : STATUS_LABELS[user.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {user.totalApplications}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {user.totalJobs}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(user.joinedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRoleTarget(user);
                                setNextRole(user.role);
                              }}
                            >
                              <ShieldCheck className="size-4" />
                              Đổi vai trò
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={
                                user.isLocked ? "" : "text-destructive"
                              }
                              onClick={() => handleToggleLock(user)}
                              disabled={updateUser.isPending}
                            >
                              {user.isLocked ? (
                                <>
                                  <Unlock className="size-4" />
                                  Mở khoá
                                </>
                              ) : (
                                <>
                                  <Lock className="size-4" />
                                  Khoá
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DIALOG ĐỔI VAI TRÒ */}
      <Dialog
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRoleTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi vai trò người dùng</DialogTitle>
            <DialogDescription>
              {roleTarget?.fullName} ({roleTarget?.email})
            </DialogDescription>
          </DialogHeader>

          <Select
            value={nextRole}
            onValueChange={(value) => setNextRole(value as RoleType)}
            items={ROLE_FILTERS.filter((item) => item.value !== "ALL").map(
              (item) => ({ value: item.value, label: item.label })
            )}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTERS.filter((item) => item.value !== "ALL").map(
                (item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleTarget(null)}
              disabled={updateUser.isPending}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? "Đang cập nhật..." : "Cập nhật vai trò"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
