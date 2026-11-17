import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/admin/hooks";
import type { JobCategory } from "@/features/shared/types";

import { showApiError, toast } from "@/lib/toast";

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

const EMPTY_FORM: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  icon: "Briefcase",
};

/** Tự sinh slug từ tên nhóm việc */
const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function AdminCategoriesPage() {
  const { data: categories = [], isPending, isError, refetch } =
    useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<JobCategory | null>(null);

  const activeCount = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (category: JobCategory) => {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên nhóm việc.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim(),
      icon: form.icon.trim() || "Briefcase",
    };

    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, payload });
        toast.success("Đã cập nhật nhóm việc.");
      } else {
        await createCategory.mutateAsync(payload);
        toast.success("Đã tạo nhóm việc mới.");
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      showApiError(error);
    }
  };

  const handleToggleActive = async (category: JobCategory) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        payload: { isActive: !category.isActive },
      });
      toast.success(
        category.isActive
          ? "Đã ẩn nhóm việc khỏi trang tìm việc."
          : "Đã kích hoạt nhóm việc."
      );
    } catch (error) {
      showApiError(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success("Đã xoá nhóm việc.", {
        description:
          deleteTarget.jobCount > 0
            ? "Nhóm việc đang có tin tuyển dụng nên chỉ bị ẩn khỏi danh sách."
            : undefined,
      });
      setDeleteTarget(null);
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <DashboardLayout
      title="Quản lý danh mục"
      description="Thêm, sửa và kích hoạt các nhóm việc (ngành nghề) trên hệ thống."
      actions={
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Thêm nhóm việc
        </Button>
      }
    >
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Nhóm việc ({categories.length})
          </CardTitle>
          <CardDescription>
            {activeCount} nhóm đang hoạt động · {categories.length - activeCount}{" "}
            nhóm đang ẩn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-lg bg-muted/60" />
              ))}
            </div>
          )}

          {isError && (
            <ErrorState
              title="Không tải được danh sách nhóm việc"
              onRetry={() => void refetch()}
            />
          )}

          {!isPending && !isError && categories.length === 0 && (
            <EmptyState
              icon="inbox"
              title="Chưa có nhóm việc nào"
              description="Bấm “Thêm nhóm việc” để tạo danh mục đầu tiên."
            />
          )}

          {!isPending && !isError && categories.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên nhóm việc</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Số tin</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {category.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {category.jobCount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.isActive ? "default" : "outline"}
                        >
                          {category.isActive ? "Đang hoạt động" : "Đang ẩn"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleToggleActive(category)
                            }
                          >
                            {category.isActive ? "Ẩn" : "Kích hoạt"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(category)}
                          >
                            <Pencil className="size-4" />
                            Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(category)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG TẠO / SỬA */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Cập nhật nhóm việc" : "Thêm nhóm việc mới"}
            </DialogTitle>
            <DialogDescription>
              Nhóm việc giúp sinh viên lọc việc làm theo ngành nghề.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Tên nhóm việc *</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                    slug:
                      editing || prev.slug
                        ? prev.slug
                        : slugify(event.target.value),
                  }))
                }
                placeholder="VD: Lập trình & Phát triển phần mềm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, slug: event.target.value }))
                }
                placeholder="lap-trinh-phat-trien"
              />
              <p className="text-xs text-muted-foreground">
                Dùng trong đường dẫn và tìm kiếm. Để trống sẽ tự sinh từ tên.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <Input
                id="category-icon"
                value={form.icon}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, icon: event.target.value }))
                }
                placeholder="Code"
              />
              <p className="text-xs text-muted-foreground">
                Tên icon lucide dùng để hiển thị, ví dụ: Code, ShoppingBag, Utensils.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Mô tả</Label>
              <Input
                id="category-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Mô tả ngắn về nhóm việc"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createCategory.isPending || updateCategory.isPending}
            >
              {editing ? "Lưu thay đổi" : "Tạo nhóm việc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG XOÁ */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xoá nhóm việc</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá “{deleteTarget?.name}”?{" "}
              {deleteTarget && deleteTarget.jobCount > 0
                ? "Nhóm việc đang có tin tuyển dụng nên sẽ được ẩn khỏi danh sách công khai."
                : "Hành động này không thể hoàn tác."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteCategory.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? "Đang xử lý..." : "Xoá nhóm việc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
