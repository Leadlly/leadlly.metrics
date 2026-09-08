import { NextRequest } from "next/server";
import { rangeFromRequest } from "@/lib/api";
import { mapTeacher } from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function teacherMatch(params: ReturnType<typeof rangeFromRequest>) {
  const match: Record<string, unknown> = { ...params.createdAt };
  if (params.role && params.role !== "all") match.role = params.role;
  const q = params.q?.trim();
  if (q) {
    const regex = { $regex: escapeRegex(q), $options: "i" };
    match.$or = [
      { firstname: regex },
      { lastname: regex },
      { email: regex },
      { teacherCode: regex },
    ];
  }
  return match;
}

export async function GET(request: NextRequest) {
  try {
    const params = rangeFromRequest(request);
    const db = await getDb();
    const mentors = db.collection("mentors");
    const match = teacherMatch(params);

    const [total, teachers, mentorCount, verified, blocked, rows] = await Promise.all([
      mentors.countDocuments(match),
      mentors.countDocuments({
        ...match,
        $or: [{ role: "teacher" }, { role: { $exists: false } }, { role: null }],
      }),
      mentors.countDocuments({ ...match, role: "mentor" }),
      mentors.countDocuments({ ...match, status: "Verified" }),
      mentors.countDocuments({ ...match, isBlocked: true }),
      mentors
        .find(match, {
          projection: {
            firstname: 1,
            lastname: 1,
            email: 1,
            phone: 1,
            role: 1,
            status: 1,
            teacherCode: 1,
            subjects: 1,
            students: 1,
            institutes: 1,
            institute: 1,
            isBlocked: 1,
            createdAt: 1,
          },
        })
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.limit)
        .toArray(),
    ]);

    return Response.json({
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.max(1, Math.ceil(total / params.limit)),
      stats: { total, teachers, mentors: mentorCount, verified, blocked },
      rows: rows.map((doc) => mapTeacher(doc as Record<string, unknown>)),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load teachers" }, { status: 500 });
  }
}
