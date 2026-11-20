"use client";

import * as React from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { isValid, parse } from "date-fns";
import { vi } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateToIso, formatDateVi, isoToDate } from "@/lib/date";
import { cn } from "cn";

/** Định dạng hiển thị trong ô input: `dd/MM/yyyy`. */
const DISPLAY_FORMAT = "dd/MM/yyyy";

type DatePickerProps = {
  /** Giá trị hiện tại dạng `yyyy-MM-dd`. */
  value: string | null | undefined;
  /** Callback khi người dùng chọn (hoặc xoá) ngày. */
  onChange: (value: string | null) => void;
  /** Id cho ô input (để `FieldLabel htmlFor` trỏ tới). */
  id?: string;
  /** Nhãn khi chưa chọn ngày. */
  placeholder?: string;
  /** Ngày sớm nhất được chọn (inclusive), dạng `yyyy-MM-dd`. */
  min?: string | null;
  /** Ngày muộn nhất được chọn (inclusive), dạng `yyyy-MM-dd`. */
  max?: string | null;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * Ô chọn ngày dựng trên shadcn `Calendar` + `Popover` + `InputGroup`.
 *
 * Ô input cho phép gõ trực tiếp theo định dạng `dd/MM/yyyy`; chọn trong
 * lịch sẽ tự đồng bộ lại nội dung input.
 *
 * Giá trị trao đổi với form vẫn là chuỗi `yyyy-MM-dd` nên không ảnh hưởng
 * payload gửi lên API.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Chọn ngày",
  min,
  max,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const date = isoToDate(value);
    return isValid(date) ? date : undefined;
  }, [value]);

  const minDate = React.useMemo(() => {
    if (!min) return undefined;
    const date = isoToDate(min);
    return isValid(date) ? date : undefined;
  }, [min]);

  const maxDate = React.useMemo(() => {
    if (!max) return undefined;
    const date = isoToDate(max);
    return isValid(date) ? date : undefined;
  }, [max]);

  /** Ngày nằm ngoài khoảng cho phép sẽ bị disable trong lịch. */
  const isOutOfRange = React.useCallback(
    (date: Date) => {
      if (minDate && date.getTime() < minDate.getTime()) return true;
      if (maxDate && date.getTime() > maxDate.getTime()) return true;
      return false;
    },
    [minDate, maxDate]
  );

  /**
   * Nội dung đang gõ trong ô input.
   *
   * `base` là giá trị (`yyyy-MM-dd`) mà draft này dựa vào — nếu giá trị bên
   * ngoài đổi (load dữ liệu, chọn trong lịch, reset form...) thì draft bị bỏ
   * qua và input hiển thị lại giá trị mới. Nhờ vậy không cần effect để đồng bộ.
   */
  const [draft, setDraft] = React.useState<{
    base: string | null;
    text: string;
  } | null>(null);

  const text =
    draft && draft.base === (value ?? null)
      ? draft.text
      : value
        ? formatDateVi(value)
        : "";

  /** Text đang gõ có hợp lệ (đúng định dạng + trong khoảng cho phép) không. */
  const isTextValid = React.useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return true;
    const parsed = parse(trimmed, DISPLAY_FORMAT, new Date());
    if (!isValid(parsed)) return false;
    return !isOutOfRange(parsed);
  }, [text, isOutOfRange]);

  const handleSelect = (date: Date | undefined) => {
    setDraft(null);
    if (!date) {
      onChange(null);
      return;
    }
    onChange(dateToIso(date));
    setOpen(false);
  };

  /** Người dùng gõ tay — chỉ commit khi chuỗi là ngày hợp lệ. */
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setDraft({ base: value ?? null, text: next });

    const trimmed = next.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }

    const parsed = parse(trimmed, DISPLAY_FORMAT, new Date());
    if (!isValid(parsed)) return;
    if (isOutOfRange(parsed)) return;

    onChange(dateToIso(parsed));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDraft(null);
    onChange(null);
  };

  return (
    <InputGroup className={cn(className)}>
      <InputGroupInput
        id={id}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        aria-label={ariaLabel}
        aria-invalid={!isTextValid ? true : undefined}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
      />
      <InputGroupAddon align="inline-end">
        {text && !disabled && (
          <InputGroupButton
            variant="ghost"
            size="icon-xs"
            aria-label="Xoá ngày"
            onClick={handleClear}
            className="text-muted-foreground hover:text-destructive"
          >
            <XIcon />
          </InputGroupButton>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                id={id ? `${id}-trigger` : undefined}
                variant="ghost"
                size="icon-xs"
                aria-label="Chọn ngày"
                disabled={disabled}
              >
                <CalendarIcon />
                <span className="sr-only">Chọn ngày</span>
              </InputGroupButton>
            }
          />
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              locale={vi}
              captionLayout="dropdown"
              selected={selected}
              onSelect={handleSelect}
              disabled={isOutOfRange}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
