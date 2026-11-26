import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  Code,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Megaphone,
  Palette,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  Utensils,
  Wrench,
} from "lucide-react";

const CATEGORY_ICON_OPTIONS = [
  { value: "Briefcase", label: "Việc làm", Icon: Briefcase },
  { value: "Code", label: "Công nghệ", Icon: Code },
  { value: "ShoppingBag", label: "Bán lẻ", Icon: ShoppingBag },
  { value: "Utensils", label: "F&B", Icon: Utensils },
  { value: "GraduationCap", label: "Gia sư", Icon: GraduationCap },
  { value: "Megaphone", label: "Marketing", Icon: Megaphone },
  { value: "Palette", label: "Thiết kế", Icon: Palette },
  { value: "Truck", label: "Giao hàng", Icon: Truck },
  { value: "Headphones", label: "CSKH", Icon: Headphones },
  { value: "Building2", label: "Văn phòng", Icon: Building2 },
  { value: "HeartHandshake", label: "Tình nguyện", Icon: HeartHandshake },
  { value: "Wrench", label: "Kỹ thuật", Icon: Wrench },
] as const;
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
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmptyState, ErrorState } from "@/components/shared/empty-state";
import {
  useAdminCategories,
  useAdminPositions,
  useCreateCategory,
  useCreatePosition,
  useDeleteCategory,
  useDeletePosition,
  useUpdateCategory,
  useUpdatePosition,
} from "@/features/admin/hooks";
import type { JobCategory, JobPosition } from "@/features/shared/types";

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

interface PositionForm {
  categoryId: string;
  name: string;
  slug: string;
}

const EMPTY_POSITION_FORM: PositionForm = {
  categoryId: "",
  name: "",
  slug: "",
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
  const {
    data: categories = [],
    isPending,
    isError,
    refetch,
  } = useAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<JobCategory | null>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("");
  const { data: positions = [], isPending: isPositionsPending } =
    useAdminPositions(selectedCategoryFilter || undefined);
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<JobPosition | null>(null);
  const [posForm, setPosForm] = useState<PositionForm>(EMPTY_POSITION_FORM);
  const [deletePosTarget, setDeletePosTarget] = useState<JobPosition | null>(
    null
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const openCreatePosition = () => {
    setEditingPos(null);
    setPosForm({
      categoryId: selectedCategoryFilter || categories[0]?.id || "",
      name: "",
      slug: "",
    });
    setPosDialogOpen(true);
  };

  const openEditPosition = (pos: JobPosition) => {
    setEditingPos(pos);
    setPosForm({
      categoryId: pos.categoryId,
      name: pos.name,
      slug: pos.slug,
    });
    setPosDialogOpen(true);
  };

  const handleSubmitPosition = async () => {
    const trimmedName = posForm.name.trim();
    if (!posForm.categoryId) {
      toast.error("Vui lòng chọn nhóm việc.");
      return;
    }
    if (!trimmedName) {
      toast.error("Vui lòng nhập tên vị trí công việc.");
      return;
    }

    try {
      if (editingPos) {
        await updatePosition.mutateAsync({
          id: editingPos.id,
          payload: {
            categoryId: posForm.categoryId,
            name: trimmedName,
            slug: posForm.slug.trim() || slugify(trimmedName),
          },
        });
        toast.success(`Đã cập nhật vị trí "${trimmedName}".`);
      } else {
        await createPosition.mutateAsync({
          categoryId: posForm.categoryId,
          name: trimmedName,
          slug: posForm.slug.trim() || slugify(trimmedName),
        });
        toast.success(`Đã tạo vị trí "${trimmedName}".`);
      }
      setPosDialogOpen(false);
    } catch (err) {
      showApiError(err);
    }
  };

  const handleDeletePosition = async () => {
    if (!deletePosTarget) return;
    try {
      await deletePosition.mutateAsync(deletePosTarget.id);
      toast.success(`Đã xoá vị trí "${deletePosTarget.name}".`);
      setDeletePosTarget(null);
    } catch (err) {
      showApiError(err);
    }
  };

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
            {activeCount} nhóm đang hoạt động ·{" "}
            {categories.length - activeCount} nhóm đang ẩn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-lg bg-muted/60"
                />
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
                            onClick={() => handleToggleActive(category)}
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
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {CATEGORY_ICON_OPTIONS.map(({ value, label, Icon }) => {
                  const selected = form.icon === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={selected}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, icon: value }))
                      }
                      className={`flex h-10 items-center justify-center rounded-md border transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Chọn biểu tượng hiển thị cho danh mục.
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

      {/* VỊ TRÍ CÔNG VIỆC */}
      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Vị trí công việc</CardTitle>
            <CardDescription>
              Các vị trí chi tiết thuộc từng nhóm việc (quan hệ 1 nhóm việc –
              nhiều vị trí).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedCategoryFilter || "all"}
              onValueChange={(value) =>
                setSelectedCategoryFilter(
                  !value || value === "all" ? "" : value
                )
              }
            >
              <SelectTrigger
                aria-label="Lọc theo nhóm việc"
                className="w-[200px]"
              >
                <SelectValue>
                  {selectedCategoryFilter
                    ? (categoryNameById.get(selectedCategoryFilter) ??
                      selectedCategoryFilter)
                    : "Tất cả nhóm việc"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhóm việc</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={openCreatePosition}
              disabled={categories.length === 0}
            >
              <Plus className="mr-1.5 size-4" />
              Thêm vị trí
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isPositionsPending ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Đang tải danh sách vị trí...
            </p>
          ) : positions.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Chưa có vị trí công việc"
              description="Thêm vị trí công việc để nhà tuyển dụng chọn khi đăng tin."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên vị trí</TableHead>
                  <TableHead>Nhóm việc</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>
                      {categoryNameById.get(pos.categoryId) ?? pos.categoryId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {pos.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pos.isActive ? "default" : "secondary"}>
                        {pos.isActive ? "Đang hoạt động" : "Đã ẩn"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Sửa ${pos.name}`}
                          onClick={() => openEditPosition(pos)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Xoá ${pos.name}`}
                          onClick={() => setDeletePosTarget(pos)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* DIALOG TẠO / SỬA VỊ TRÍ */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPos
                ? "Cập nhật vị trí công việc"
                : "Thêm vị trí công việc"}
            </DialogTitle>
            <DialogDescription>
              Gắn vị trí công việc vào một nhóm việc cụ thể.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="position-category">Nhóm việc</Label>
              <Select
                value={posForm.categoryId}
                onValueChange={(value) =>
                  setPosForm((prev) => ({ ...prev, categoryId: value ?? "" }))
                }
              >
                <SelectTrigger id="position-category" className="w-full">
                  <SelectValue>
                    {posForm.categoryId
                      ? (categoryNameById.get(posForm.categoryId) ??
                        posForm.categoryId)
                      : "-- Chọn nhóm việc --"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position-name">Tên vị trí</Label>
              <Input
                id="position-name"
                value={posForm.name}
                onChange={(e) =>
                  setPosForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ví dụ: Phục vụ bàn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position-slug">Slug</Label>
              <Input
                id="position-slug"
                value={posForm.slug}
                onChange={(e) =>
                  setPosForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="phuc-vu-ban"
              />
              <p className="text-xs text-muted-foreground">
                Để trống sẽ tự sinh từ tên vị trí.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPosDialogOpen(false)}
              disabled={createPosition.isPending || updatePosition.isPending}
            >
              Huỷ
            </Button>
            <Button
              onClick={handleSubmitPosition}
              disabled={createPosition.isPending || updatePosition.isPending}
            >
              {editingPos ? "Lưu thay đổi" : "Tạo vị trí"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG XOÁ VỊ TRÍ */}
      <Dialog
        open={deletePosTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePosTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xoá vị trí công việc</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xoá “{deletePosTarget?.name}”? Nếu đang có tin
              tuyển dụng sử dụng, vị trí sẽ được ẩn thay vì xoá cứng.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletePosTarget(null)}
              disabled={deletePosition.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePosition}
              disabled={deletePosition.isPending}
            >
              {deletePosition.isPending ? "Đang xử lý..." : "Xoá vị trí"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
