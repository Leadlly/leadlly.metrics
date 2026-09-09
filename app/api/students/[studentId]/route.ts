import {
  mapStudentDetail,
  mapTracker,
  parseObjectId,
} from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { buildStudentReports } from "@/lib/student-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    const { studentId } = await params;
    const id = parseObjectId(studentId);
    if (!id) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    const db = await getDb();
    const [doc, reports, trackers, quizAttempts] = await Promise.all([
      db.collection("users").findOne(
        { _id: id },
        { projection: { password: 0, salt: 0, resetPasswordToken: 0 } },
      ),
      buildStudentReports(db, id),
      db.collection("trackers").find({ $or: [{ user: id }, { user: studentId }] }).sort({ updatedAt: -1 }).toArray(),
      db.collection("studentquizattempts").countDocuments({
        $or: [{ userId: id }, { user: id }, { userId: studentId }, { user: studentId }],
      }),
    ]);

    if (!doc) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    return Response.json({
      student: mapStudentDetail(doc as Record<string, unknown>),
      reports,
      tracker: trackers.map((item) => mapTracker(item as Record<string, unknown>)),
      quizAttempts,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load student" }, { status: 500 });
  }
}