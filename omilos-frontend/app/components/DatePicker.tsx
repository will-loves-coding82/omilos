"use client";

import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "mm/dd/yyyy",
  className,
}: {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-fit">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          className ??
          "flex items-center justify-between gap-3 rounded-lg border border-border-primary bg-bg-primary px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary"
        }
      >
        <span className={value ? "text-text-primary" : "text-text-secondary"}>
          {value ? formatDate(value) : placeholder}
        </span>
        <Calendar size={16} className="text-text-secondary" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 rounded-xl border border-border-primary bg-bg-primary p-4 shadow-lg">
          <DayPicker
            mode="single"
            selected={value}
            disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            classNames={{
              root: "text-text-primary",
              months: "flex gap-4",
              month: "flex flex-col gap-3",
              month_caption: "flex items-center justify-center px-8 py-1",
              caption_label: "text-sm font-medium text-text-primary",
              nav: "flex items-center justify-between absolute inset-x-0 top-0 px-2 py-2",
              button_previous:
                "size-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-secondary disabled:opacity-30",
              button_next:
                "size-7 flex items-center justify-center rounded-md text-text-secondary hover:bg-bg-secondary disabled:opacity-30",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday: "w-9 text-xs font-medium text-text-secondary",
              week: "flex mt-1",
              day: "size-9 flex items-center justify-center p-0 text-sm",
              day_button:
                "size-9 rounded-md text-text-blue hover:bg-bg-secondary transition-colors",
              today: "font-semibold text-info",
              selected: "[&>button]:bg-info [&>button]:text-text-inverse [&>button]:hover:bg-info",
              outside: "text-text-disabled",
              disabled: "text-text-disabled",
            }}
          />
        </div>
      )}
    </div>
  );
}
