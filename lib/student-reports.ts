import type { Db, ObjectId } from "mongodb";
import {
  addYmd,
  eachYmd,
  istIsoWeekStartYmd,
  istMonthEndYmd,
  istMonthStartYmd,
  istNowYmd,
  istYmd,
  weekdayFromYmd,
} from "@/lib/ist";

export type ReportDay = {
  day: string;
  date: string;
  session: number;
  quiz: number;
  overall: number;
};

function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function sum(rows: Array<{ session?: number; quiz?: number }>, key: "session" | "quiz") {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

export async function buildStudentReports(db: Db, userId: ObjectId) {
  const raw = await db
    .collection("studentreports")
    .find({ $or: [{ user: userId }, { user: userId.toHexString() }] })
    .toArray();

  const reports = raw
    .map((doc) => {
      if (!doc.date) return null;
      const date = new Date(doc.date as Date);
      if (Number.isNaN(date.getTime())) return null;
      return {
        ymd: istYmd(date),
        session: Number(doc.session || 0),
        quiz: Number(doc.quiz || 0),
        overall: Number(doc.overall || 0),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const byDay = new Map<string, { session: number; quiz: number; overall: number }>();
  for (const report of reports) {
    const current = byDay.get(report.ymd) || { session: 0, quiz: 0, overall: 0 };
    current.session += report.session;
    current.quiz += report.quiz;
    current.overall += report.overall;
    byDay.set(report.ymd, current);
  }

  function daysFor(start: string, end: string): ReportDay[] {
    return eachYmd(start, end).map((ymd) => {
      const report = byDay.get(ymd);
      return {
        day: weekdayFromYmd(ymd),
        date: ymd,
        session: report?.session ?? 0,
        quiz: report?.quiz ?? 0,
        overall: report?.overall ?? 0,
      };
    });
  }

  function actualReports(start: string, end: string) {
    return reports.filter((item) => item.ymd >= start && item.ymd <= end);
  }

  const today = istNowYmd();
  const weekStart = istIsoWeekStartYmd(today);
  const weekEnd = addYmd(weekStart, 6);
  const lastWeekStart = addYmd(weekStart, -7);
  const lastWeekEnd = addYmd(weekStart, -1);
  const monthStart = istMonthStartYmd(today);
  const monthEnd = istMonthEndYmd(today);

  const weeklyDays = daysFor(weekStart, weekEnd);
  const thisWeek = actualReports(weekStart, weekEnd);
  const lastWeek = actualReports(lastWeekStart, lastWeekEnd);

  const currentTopicsRevised = sum(thisWeek, "session");
  const lastTopicsRevised = sum(lastWeek, "session");
  const currentAccuracy = thisWeek.length
    ? sum(thisWeek, "quiz") / thisWeek.length
    : 0;
  const lastAccuracy = lastWeek.length
    ? sum(lastWeek, "quiz") / lastWeek.length
    : 0;

  const overall = Array.from(byDay.keys())
    .sort()
    .map((ymd) => {
      const report = byDay.get(ymd)!;
      return {
        day: weekdayFromYmd(ymd),
        date: ymd,
        ...report,
      };
    });

  return {
    weekly: {
      startDate: weekStart,
      endDate: weekEnd,
      days: weeklyDays,
      metrics: {
        topicsRevisedChange: percentChange(currentTopicsRevised, lastTopicsRevised),
        revisionAccuracyChange: percentChange(currentAccuracy, lastAccuracy),
      },
    },
    monthly: {
      startDate: monthStart,
      endDate: monthEnd,
      days: daysFor(monthStart, monthEnd),
    },
    overall,
  };
}
