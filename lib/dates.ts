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
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy");
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "dd MMM yyyy, hh:mm a");
}

export function toISODate(value: Date) {
  return format(value, "yyyy-MM-dd");
}
