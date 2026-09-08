import {
  fileResponse,
  pickExportFields,
  rowsForExport,
  toCsv,
  toXlsx,
} from "@/lib/export";
import { TEACHER_EXPORT_FIELDS } from "@/lib/fields";
import { createdAtFilter } from "@/lib/dates";
import { mapTeacher } from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { EXPORT_LIMIT } from "@/lib/api";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      from?: string;
      to?: string;
      q?: string;
      role?: string;
      fields?: string[];
      format?: "csv" | "xlsx";
    };

    const db = await getDb();
    const match: Record<string, unknown> = {
      ...createdAtFilter({ from: body.from, to: body.to }),
    };
    if (body.role && body.role !== "all") match.role = body.role;
    const q = body.q?.trim();
    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      match.$or = [{ firstname: regex }, { lastname: regex }, { email: regex }];
    }

    const docs = await db
      .collection("mentors")
      .find(match, {
        projection: {
          password: 0,
          salt: 0,
          resetPasswordToken: 0,
          gmeet: 0,
        },
      })
      .sort({ createdAt: -1 })
      .limit(EXPORT_LIMIT)
      .toArray();

    const fields = pickExportFields(body.fields, TEACHER_EXPORT_FIELDS);
    const mapped = docs.map((doc) =>
      mapTeacher(doc as Record<string, unknown>),
    ) as Array<Record<string, unknown>>;
    const rows = rowsForExport(mapped, fields);
    const stamp = new Date().toISOString().slice(0, 10);

    if (body.format === "xlsx") {
      return fileResponse(toXlsx(rows, "Teachers"), `teachers-${stamp}.xlsx`, "xlsx");
    }
    return fileResponse(toCsv(rows, fields), `teachers-${stamp}.csv`, "csv");
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to export teachers" }, { status: 500 });
  }
}
