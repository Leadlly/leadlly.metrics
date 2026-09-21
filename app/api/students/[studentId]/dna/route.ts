import { parseObjectId } from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { buildStudentDnaProfile } from "@/lib/study-dna";

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
    const user = await db.collection("users").findOne(
      { _id: id },
      { projection: { onboard: 1 } },
    );
    if (!user) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }
    if (user.onboard !== true) {
      return Response.json(
        { error: "DNA report not generated", generated: false },
        { status: 404 },
      );
    }

    const profile = await buildStudentDnaProfile(db, id);
    if (!profile) {
      return Response.json({ error: "Could not build DNA report" }, { status: 500 });
    }
    return Response.json({ generated: true, profile });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load DNA report" }, { status: 500 });
  }
}
