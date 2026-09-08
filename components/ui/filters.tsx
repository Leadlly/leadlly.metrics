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
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
      <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          className="w-full min-w-0 sm:w-[160px]"
        />
      </label>
      <label className="grid min-w-0 gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          className="w-full min-w-0 sm:w-[160px]"
        />
      </label>
      <Button onClick={onApply} className="w-full sm:w-auto">
        Apply
      </Button>
      <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
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
    <div className="flex flex-col gap-3 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total.toLocaleString("en-IN")} records · page {page} of {pages}
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}
