import { createdAtFilter } from "@/lib/dates";
import {
  fileResponse,
  pickExportFields,
  rowsForExport,
  toCsv,
  toXlsx,
} from "@/lib/export";
import { STUDENT_EXPORT_FIELDS } from "@/lib/fields";
import { mapStudent } from "@/lib/mappers";
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
      category?: string;
      fields?: string[];
      format?: "csv" | "xlsx";
    };

    const db = await getDb();
    const match: Record<string, unknown> = {
      ...createdAtFilter({ from: body.from, to: body.to }),
    };
    if (body.category && body.category !== "all") match.category = body.category;
    const q = body.q?.trim();
    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      match.$or = [{ firstname: regex }, { lastname: regex }, { email: regex }];
    }

    const docs = await db
      .collection("users")
      .find(match, {
        projection: { password: 0, salt: 0, resetPasswordToken: 0 },
      })
      .sort({ createdAt: -1 })
      .limit(EXPORT_LIMIT)
      .toArray();

    const fields = pickExportFields(body.fields, STUDENT_EXPORT_FIELDS);
    const mapped = docs.map((doc) =>
      mapStudent(doc as Record<string, unknown>),
    ) as Array<Record<string, unknown>>;
    const rows = rowsForExport(mapped, fields);
    const stamp = new Date().toISOString().slice(0, 10);

    if (body.format === "xlsx") {
      return fileResponse(toXlsx(rows, "Students"), `students-${stamp}.xlsx`, "xlsx");
    }
    return fileResponse(toCsv(rows, fields), `students-${stamp}.csv`, "csv");
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to export students" }, { status: 500 });
  }
}
