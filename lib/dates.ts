import { format } from "date-fns";

export type DateRange = {
  from?: string | null;
  to?: string | null;
};

export function createdAtFilter(range: DateRange) {
  const { from, to } = range;
  if (!from && !to) return {};

  const createdAt: Record<string, Date> = {};
  if (from) createdAt.$gte = new Date(`${from}T00:00:00+05:30`);
  if (to) createdAt.$lte = new Date(`${to}T23:59:59.999+05:30`);
  return { createdAt };
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return format(new Date(`${value}T00:00:00+05:30`), "dd MMM yyyy");
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function toISODate(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function formatRangeTitle(from?: string | null, to?: string | null) {
  if (!from && !to) return "all time";
  if (from && to && from === to) return formatDate(from);
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `from ${formatDate(from)}`;
  return `until ${formatDate(to)}`;
}
