"use client";

import { Button, Input } from "./primitives";

export function DateRangeFilter({
  from,
  to,
  onFrom,
  onTo,
  onApply,
  onReset,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="w-[160px]"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="w-[160px]"
        />
      </label>
      <Button onClick={onApply}>Apply</Button>
      <Button variant="outline" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
      <span>
        {total.toLocaleString("en-IN")} records · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
