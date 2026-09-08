import { ObjectId } from "mongodb";
import { EXPORT_LIMIT } from "@/lib/api";
import { createdAtFilter } from "@/lib/dates";
import {
  fileResponse,
  pickExportFields,
  rowsForExport,
  toCsv,
  toXlsx,
} from "@/lib/export";
import { INSTITUTE_EXPORT_FIELDS } from "@/lib/fields";
import { mapInstitute } from "@/lib/mappers";
import { getDb } from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toCountMap(rows: Array<{ _id: unknown; count: number }>) {
  const map = new Map<string, number>();
  for (const row of rows) map.set(String(row._id), row.count);
  return map;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      from?: string;
      to?: string;
      q?: string;
      fields?: string[];
      format?: "csv" | "xlsx";
    };

    const db = await getDb();
    const match: Record<string, unknown> = {
      ...createdAtFilter({ from: body.from, to: body.to }),
    };
    const q = body.q?.trim();
    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      match.$or = [{ name: regex }, { email: regex }, { instituteCode: regex }];
    }

    const docs = await db
      .collection("institutes")
      .find(match)
      .sort({ createdAt: -1 })
      .limit(EXPORT_LIMIT)
      .toArray();
    const ids = docs.map((d) => d._id as ObjectId);

    const [studentCounts, teacherCounts, batchCounts] = ids.length
      ? await Promise.all([
          db
            .collection("users")
            .aggregate([
              { $match: { "institute._id": { $in: ids } } },
              { $group: { _id: "$institute._id", count: { $sum: 1 } } },
            ])
            .toArray(),
          db
            .collection("mentors")
            .aggregate([
              {
                $match: {
                  $or: [
                    { institute: { $in: ids } },
                    { "institutes._id": { $in: ids } },
                  ],
                },
              },
              {
                $project: {
                  instIds: {
                    $setUnion: [
                      {
                        $cond: [
                          { $ifNull: ["$institute", false] },
                          ["$institute"],
                          [],
                        ],
                      },
                      {
                        $map: {
                          input: { $ifNull: ["$institutes", []] },
                          as: "i",
                          in: "$$i._id",
                        },
                      },
                    ],
                  },
                },
              },
              { $unwind: "$instIds" },
              { $match: { instIds: { $in: ids } } },
              { $group: { _id: "$instIds", count: { $sum: 1 } } },
            ])
            .toArray(),
          db
            .collection("batches")
            .aggregate([
              { $match: { institute: { $in: ids } } },
              { $group: { _id: "$institute", count: { $sum: 1 } } },
            ])
            .toArray(),
        ])
      : [[], [], []];

    const sMap = toCountMap(studentCounts as Array<{ _id: unknown; count: number }>);
    const tMap = toCountMap(teacherCounts as Array<{ _id: unknown; count: number }>);
    const bMap = toCountMap(batchCounts as Array<{ _id: unknown; count: number }>);

    const mapped = docs.map((doc) =>
      mapInstitute(doc as Record<string, unknown>, {
        students: sMap.get(String(doc._id)) || 0,
        teachers: tMap.get(String(doc._id)) || 0,
        batches: bMap.get(String(doc._id)) || 0,
      }),
    ) as Array<Record<string, unknown>>;

    const fields = pickExportFields(body.fields, INSTITUTE_EXPORT_FIELDS);
    const rows = rowsForExport(mapped, fields);
    const stamp = new Date().toISOString().slice(0, 10);

    if (body.format === "xlsx") {
      return fileResponse(toXlsx(rows, "Institutes"), `institutes-${stamp}.xlsx`, "xlsx");
    }
    return fileResponse(toCsv(rows, fields), `institutes-${stamp}.csv`, "csv");
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to export institutes" }, { status: 500 });
  }
}
