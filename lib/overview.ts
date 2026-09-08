import { getDb, safeCount } from "./mongodb";
import { daysAgo } from "./dates";

const IST = "Asia/Kolkata";

function lastActivityMatch(since: Date, extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    $expr: {
      $gte: [{ $ifNull: ["$updatedAt", "$createdAt"] }, since],
    },
  };
}

function mergeGte(createdAt: Record<string, unknown>, gte: Date) {
  const existing =
    (createdAt.createdAt as { $gte?: Date; $lte?: Date } | undefined) || {};
  const nextGte = existing.$gte && existing.$gte > gte ? existing.$gte : gte;
  return { createdAt: { ...existing, $gte: nextGte } };
}

type DateGrain = "day" | "month";

function istDateKey(date: Date, grain: DateGrain) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return grain === "month" ? parts.slice(0, 7) : parts;
}

function trendWindow(createdAt: Record<string, unknown>, now: Date) {
  const range =
    (createdAt.createdAt as { $gte?: Date; $lte?: Date } | undefined) || {};
  const end = range.$lte || now;
  const start =
    range.$gte || new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const spanDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
  );
  const grain: DateGrain = spanDays <= 90 ? "day" : "month";
  const match = Object.keys(createdAt).length
    ? createdAt
    : { createdAt: { $gte: start } };
  return { start, end, grain, match };
}

function dateGroupId(grain: DateGrain) {
  const date = { date: "$createdAt", timezone: IST };
  const id: Record<string, unknown> = {
    year: { $year: date },
    month: { $month: date },
  };
  if (grain === "day") id.day = { $dayOfMonth: date };
  return id;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function rowKey(
  row: { _id: { year: number; month: number; day?: number } },
  grain: DateGrain,
) {
  const year = row._id.year;
  const month = pad(row._id.month);
  if (grain === "month") return `${year}-${month}`;
  return `${year}-${month}-${pad(row._id.day || 1)}`;
}

function emptyTrendBuckets(
  start: Date,
  end: Date,
  grain: DateGrain,
) {
  const map = new Map<string, { students: number; staff: number }>();
  if (grain === "day") {
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      map.set(istDateKey(new Date(t), "day"), { students: 0, staff: 0 });
    }
    map.set(istDateKey(end, "day"), map.get(istDateKey(end, "day")) || {
      students: 0,
      staff: 0,
    });
    return map;
  }
  let cursor = istDateKey(start, "month");
  const last = istDateKey(end, "month");
  while (cursor <= last) {
    map.set(cursor, { students: 0, staff: 0 });
    const [year, month] = cursor.split("-").map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    cursor = `${nextYear}-${pad(nextMonth)}`;
  }
  return map;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function trendLabel(key: string, grain: DateGrain) {
  const [year, month, day] = key.split("-").map(Number);
  if (grain === "day") {
    return `${pad(day)} ${MONTHS[month - 1]}`;
  }
  return `${MONTHS[month - 1]} ${String(year).slice(2)}`;
}

export async function getOverview(createdAt: Record<string, unknown>) {
  const db = await getDb();
  const now = new Date();
  const d1 = daysAgo(1);
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const trend = trendWindow(createdAt, now);

  const users = db.collection("users");
  const mentors = db.collection("mentors");

  const [
    students,
    active1d,
    active7d,
    active30d,
    paidStudents,
    activeSubs,
    freeTrials,
    newToday,
    new7d,
    new30d,
    staffTotal,
    teachers,
    mentorCount,
    verifiedStaff,
    institutes,
    admins,
    batches,
    classes,
    payments,
    meetings,
    categoryBreakdown,
    examBreakdown,
    signupTrend,
    teacherSignupTrend,
  ] = await Promise.all([
    safeCount(db, "users", createdAt),
    users.countDocuments(lastActivityMatch(d1, createdAt)),
    users.countDocuments(lastActivityMatch(d7, createdAt)),
    users.countDocuments(lastActivityMatch(d30, createdAt)),
    users.countDocuments({
      ...createdAt,
      $or: [
        { category: { $in: ["pro", "plus", "premium", "paid", "consistency"] } },
        { "subscription.status": { $in: ["active", "authenticated", "created"] } },
      ],
    }),
    users.countDocuments({
      ...createdAt,
      "subscription.status": { $in: ["active", "authenticated"] },
    }),
    users.countDocuments({ ...createdAt, "freeTrial.active": true }),
    users.countDocuments(mergeGte(createdAt, d1)),
    users.countDocuments(mergeGte(createdAt, d7)),
    users.countDocuments(mergeGte(createdAt, d30)),
    safeCount(db, "mentors", createdAt),
    mentors.countDocuments({
      ...createdAt,
      $or: [{ role: "teacher" }, { role: { $exists: false } }, { role: null }],
    }),
    mentors.countDocuments({ ...createdAt, role: "mentor" }),
    mentors.countDocuments({ ...createdAt, status: "Verified" }),
    safeCount(db, "institutes", createdAt),
    safeCount(db, "admins", createdAt),
    safeCount(db, "batches", createdAt),
    safeCount(db, "classes", createdAt),
    safeCount(db, "payments", createdAt),
    safeCount(db, "meetings", createdAt),
    users
      .aggregate([
        { $match: Object.keys(createdAt).length ? createdAt : {} },
        {
          $group: {
            _id: { $ifNull: ["$category", "free"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    users
      .aggregate([
        { $match: Object.keys(createdAt).length ? createdAt : {} },
        {
          $group: {
            _id: { $ifNull: ["$academic.competitiveExam", "Unspecified"] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ])
      .toArray(),
    users
      .aggregate([
        { $match: trend.match },
        {
          $group: {
            _id: dateGroupId(trend.grain),
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ])
      .toArray(),
    mentors
      .aggregate([
        { $match: trend.match },
        {
          $group: {
            _id: dateGroupId(trend.grain),
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
      ])
      .toArray(),
  ]);

  const trendMap = emptyTrendBuckets(trend.start, trend.end, trend.grain);
  for (const row of signupTrend) {
    const key = rowKey(
      row as { _id: { year: number; month: number; day?: number } },
      trend.grain,
    );
    const current = trendMap.get(key);
    if (current) current.students = row.count as number;
  }
  for (const row of teacherSignupTrend) {
    const key = rowKey(
      row as { _id: { year: number; month: number; day?: number } },
      trend.grain,
    );
    const current = trendMap.get(key);
    if (current) current.staff = row.count as number;
  }

  const signups = Array.from(trendMap.entries()).map(([key, value]) => ({
    label: trendLabel(key, trend.grain),
    students: value.students,
    staff: value.staff,
  }));

  return {
    generatedAt: now.toISOString(),
    totals: {
      students,
      teachers,
      mentors: mentorCount,
      staff: staffTotal,
      institutes,
      admins,
      batches,
      classes,
      payments,
      meetings,
    },
    students: {
      total: students,
      active1d,
      active7d,
      active30d,
      paid: paidStudents,
      free: Math.max(students - paidStudents, 0),
      activeSubs,
      freeTrials,
      newToday,
      new7d,
      new30d,
    },
    staff: {
      teachers,
      mentors: mentorCount,
      verified: verifiedStaff,
    },
    charts: {
      signups,
      categories: categoryBreakdown.map((row) => ({
        name: String(row._id || "free"),
        value: row.count as number,
      })),
      exams: examBreakdown.map((row) => ({
        name: String(row._id || "Unspecified") || "Unspecified",
        value: row.count as number,
      })),
      roles: [
        { name: "Students", value: students },
        { name: "Teachers", value: teachers },
        { name: "Mentors", value: mentorCount },
        { name: "Institutes", value: institutes },
      ],
    },
  };
}
