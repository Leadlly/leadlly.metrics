import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { rangeFromRequest } from "@/lib/api";
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

export async function GET(request: NextRequest) {
  try {
    const params = rangeFromRequest(request);
    const db = await getDb();
    const institutes = db.collection("institutes");
    const match: Record<string, unknown> = { ...params.createdAt };
    const q = params.q?.trim();
    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      match.$or = [
        { name: regex },
        { email: regex },
        { instituteCode: regex },
        { city: regex },
      ];
    }

    const [total, rows, batchTotal, classTotal, adminTotal] = await Promise.all([
      institutes.countDocuments(match),
      institutes
        .find(match)
        .sort({ createdAt: -1 })
        .skip(params.skip)
        .limit(params.limit)
        .toArray(),
      db.collection("batches").countDocuments(params.createdAt),
      db.collection("classes").countDocuments(params.createdAt),
      db.collection("admins").countDocuments(params.createdAt),
    ]);

    const ids = rows.map((d) => d._id as ObjectId);
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

    return Response.json({
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.max(1, Math.ceil(total / params.limit)),
      stats: {
        total,
        batches: batchTotal,
        classes: classTotal,
        admins: adminTotal,
      },
      rows: rows.map((doc) =>
        mapInstitute(doc as Record<string, unknown>, {
          students: sMap.get(String(doc._id)) || 0,
          teachers: tMap.get(String(doc._id)) || 0,
          batches: bMap.get(String(doc._id)) || 0,
        }),
      ),
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load institutes" }, { status: 500 });
  }
}
