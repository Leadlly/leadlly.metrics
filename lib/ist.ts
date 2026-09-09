export const IST = "Asia/Kolkata";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function istYmd(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function istNowYmd() {
  return istYmd(new Date());
}

export function isSameIstDay(
  value?: Date | string | null,
  other: Date | string = new Date(),
) {
  if (!value) return false;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return false;
  const compare = typeof other === "string" ? new Date(other) : other;
  return istYmd(date) === istYmd(compare);
}

export function addYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function eachYmd(start: string, end: string) {
  const days: string[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    current = addYmd(current, 1);
  }
  return days;
}

export function weekdayFromYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function istIsoWeekStartYmd(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addYmd(ymd, -offset);
}

export function istMonthStartYmd(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

export function istMonthEndYmd(ymd: string) {
  const [year, month] = ymd.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(last)}`;
}

export function istDayStart(ymd: string) {
  return new Date(`${ymd}T00:00:00+05:30`);
}

export function istDayEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999+05:30`);
}

export function istTodayDate() {
  const [year, month, day] = istNowYmd().split("-").map(Number);
  return new Date(year, month - 1, day);
}
