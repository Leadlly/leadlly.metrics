import { NextRequest } from "next/server";
import { rangeFromSearch } from "@/lib/api";
import { getOverview } from "@/lib/overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const data = await getOverview(rangeFromSearch(request.nextUrl.searchParams));
    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
