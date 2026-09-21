import { NextRequest } from "next/server";
import { applyStudentPlanFilter, applyOnboardFilter, rangeFromRequest } from "@/lib/api";
import { daysAgo } from "@/lib/dates";
import { mapStudent, parseObjectId } from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIST_PROJECTION = {
  firstname: 1,
  lastname: 1,
  email: 1,
  phone: 1,
  parent: 1,
  category: 1,
  "academic.standard": 1,
  "academic.competitiveExam": 1,
  "academic.coachingName": 1,
  "academic.schoolOrCollegeName": 1,
  "institute.name": 1,
  "subscription.status": 1,
  "subscription.planId": 1,
  "freeTrial.active": 1,
  "freeTrial.availed": 1,
  "details.level.number": 1,
  "details.points.number": 1,
  "details.streak.number": 1,
  "details.streak.updatedAt": 1,
  "details.report.dailyReport.date": 1,
  "details.report.dailyReport.session": 1,
  "details.report.dailyReport.quiz": 1,
  "details.report.dailyReport.overall": 1,
  "about.gender": 1,
  onboard: 1,
  createdAt: 1,
  updatedAt: 1,
  disabled: 1,
};

function parseIdList(value: string | null) {
  if (!value) return [];
  const ids = [];
  for (const part of value.split(",")) {
    const id = parseObjectId(part.trim());
    if (id) ids.push(id);
    if (ids.length >= 1000) break;
  }
  return ids;
}

function studentMatch(
  params: ReturnType<typeof rangeFromRequest>,
  ids: ReturnType<typeof parseIdList>,
  excludeIds: ReturnType<typeof parseIdList>,
) {
  const match: Record<string, unknown> = { ...params.createdAt };
  applyStudentPlanFilter(match, params.category);
  applyOnboardFilter(match, params.onboard);
  const q = params.q?.trim();
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: "i" };
    match.$or = [{ firstname: regex }, { lastname: regex }, { email: regex }];
  }
  if (ids.length) match._id = { $in: ids };
  else if (excludeIds.length) match._id = { $nin: excludeIds };
  return match;
}

export async function GET(request: NextRequest) {
  try {
    const params = rangeFromRequest(request);
    const ids = parseIdList(request.nextUrl.searchParams.get("ids"));
    const excludeIds = parseIdList(request.nextUrl.searchParams.get("excludeIds"));
    const db = await getDb();
    const users = db.collection("users");
    const match = studentMatch(params, ids, excludeIds);
    const d1 = daysAgo(1);
    const d7 = daysAgo(7);
    const d30 = daysAgo(30);

    const activity = (since: Date) => ({
      ...match,
      $expr: { $gte: [{ $ifNull: ["$updatedAt", "$createdAt"] }, since] },
    });

    const [total, active1d, active7d, active30d, rows, recent] = await Promise.all([
      users.countDocuments(match),
      users.countDocuments(activity(d1)),
      users.countDocuments(activity(d7)),
      users.countDocuments(activity(d30)),
      users
        .find(match, { projection: LIST_PROJECTION })
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.limit)
        .toArray(),
      users
        .find(match, { projection: LIST_PROJECTION })
        .sort({ updatedAt: -1 })
        .limit(8)
        .toArray(),
    ]);

    return Response.json({
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.max(1, Math.ceil(total / params.limit)),
      stats: {
        total,
        active1d,
        active7d,
        active30d,
      },
      rows: rows.map((doc) => mapStudent(doc as Record<string, unknown>)),
      recent: recent.map((doc) => mapStudent(doc as Record<string, unknown>)),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load students" }, { status: 500 });
  }
}
