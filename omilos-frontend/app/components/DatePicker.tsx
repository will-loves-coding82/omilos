"use client";

import { Calendar } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updateCoords = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords({ top: rect.bottom + 8, left: rect.left });
      }
    };
    updateCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-fit">
      <button
        type="button"
        onClick={() => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setCoords({ top: rect.bottom + 8, left: rect.left });
          }
          setOpen((prev) => !prev);
        }}
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

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] rounded-xl border border-border-primary bg-bg-primary p-4 shadow-lg"
          style={{ top: coords.top, left: coords.left }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
