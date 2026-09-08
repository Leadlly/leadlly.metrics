"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Lock, RotateCcw, Settings2 } from "lucide-react";
import type { TableColumn } from "@/lib/columns";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

export function ColumnPicker({
  catalog,
  order,
  visible,
  onToggle,
  onReorder,
  onReset,
}: {
  catalog: TableColumn[];
  order: string[];
  visible: string[];
  onToggle: (key: string) => void;
  onReorder: (order: string[]) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 16 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    place();
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const columns = order
    .map((key) => catalog.find((column) => column.key === key))
    .filter((column): column is TableColumn => Boolean(column));

  function move(key: string, targetKey: string) {
    if (key === targetKey) return;
    const next = [...order];
    const from = next.indexOf(key);
    const to = next.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    next.splice(from, 1);
    next.splice(to, 0, key);
    onReorder(next);
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        className="size-8 shrink-0 px-0"
        aria-label="Choose table columns"
        onClick={() => setOpen((value) => !value)}
      >
        <Settings2 className="size-4" />
      </Button>
      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-50 flex max-h-[min(28rem,80dvh)] w-[min(20rem,calc(100vw-1.5rem))] flex-col rounded-2xl border border-border bg-white shadow-lg"
              style={{ top: pos.top, right: pos.right }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                <p className="text-sm font-semibold">Table columns</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onReset}
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                Drag to reorder. At least one column stays on.
              </p>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                {columns.map((column) => {
                  const checked = visible.includes(column.key);
                  return (
                    <div
                      key={column.key}
                      draggable
                      onDragStart={() => setDragKey(column.key)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragKey) move(dragKey, column.key);
                        setDragKey(null);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
                        dragKey === column.key && "bg-muted",
                      )}
                    >
                      <span className="cursor-grab text-muted-foreground active:cursor-grabbing">
                        <GripVertical className="size-4" />
                      </span>
                      <label className="flex min-w-0 flex-1 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={column.locked}
                          onChange={() => onToggle(column.key)}
                        />
                        <span className="truncate">{column.label}</span>
                      </label>
                      {column.locked ? (
                        <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
