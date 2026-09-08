import { getDb, safeCount } from "./mongodb";
import { daysAgo } from "./dates";

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

export async function getOverview(createdAt: Record<string, unknown>) {
  const db = await getDb();
  const now = new Date();
  const d1 = daysAgo(1);
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const trendStart = new Date(now.getFullYear() - 3, now.getMonth(), 1);

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
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .toArray(),
    mentors
      .aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .toArray(),
  ]);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const trendMap = new Map<string, { students: number; staff: number }>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendMap.set(`${d.getFullYear()}-${d.getMonth() + 1}`, {
      students: 0,
      staff: 0,
    });
  }
  for (const row of signupTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    const current = trendMap.get(key);
    if (current) current.students = row.count as number;
  }
  for (const row of teacherSignupTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    const current = trendMap.get(key);
    if (current) current.staff = row.count as number;
  }

  const signups = Array.from(trendMap.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: `${monthNames[month - 1]} ${String(year).slice(2)}`,
      students: value.students,
      staff: value.staff,
    };
  });

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
