"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { STUDENT_LEAD_TAGS, getLeadTag, type LeadTag } from "@/lib/student-tags";
import { cn } from "@/lib/utils";

export function LeadTagBadge({
  tagId,
  onRemove,
}: {
  tagId?: string | null;
  onRemove?: () => void;
}) {
  const tag = getLeadTag(tagId);
  if (!tag) return null;
  return (
    <Badge tone={tag.tone}>
      {tag.label}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${tag.label} tag`}
          className="-mr-1 ml-1 inline-flex size-3.5 items-center justify-center rounded-full hover:bg-black/10"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-2.5" strokeWidth={2.5} />
        </button>
      ) : null}
    </Badge>
  );
}

export function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 cursor-pointer accent-primary"
      aria-label="Select all students on this page"
    />
  );
}

export function RowCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(event) => onChange(event.target.checked)}
      className="size-4 cursor-pointer accent-primary"
    />
  );
}

export function LeadTagMenu({
  count,
  onTag,
}: {
  count: number;
  onTag: (tag: LeadTag | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        size="sm"
        onClick={() => setOpen((value) => !value)}
      >
        Mark as
        <ChevronDown className="size-3.5" />
      </Button>
      {open ? (
        <div
          ref={panelRef}
          className="absolute top-full left-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
        >
          <p className="border-b border-border px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Mark {count} student{count === 1 ? "" : "s"}
          </p>
          <ul className="max-h-72 overflow-y-auto p-1">
            {STUDENT_LEAD_TAGS.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-xl px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    onTag(tag);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Badge tone={tag.tone}>{tag.label}</Badge>
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{tag.hint}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={cn(
              "w-full border-t border-border px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted",
            )}
            onClick={() => {
              onTag(null);
              setOpen(false);
            }}
          >
            Clear tag
          </button>
        </div>
      ) : null}
    </div>
  );
}
