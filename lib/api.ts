import { NextRequest } from "next/server";
import { createdAtFilter } from "./dates";
import { escapeRegex } from "./utils";

export const PAGE_SIZE = 25;
export const EXPORT_LIMIT = 100_000;

export function rangeFromSearch(search: URLSearchParams) {
  return createdAtFilter({
    from: search.get("from"),
    to: search.get("to"),
  });
}

export function paginationFromSearch(search: URLSearchParams) {
  const page = Math.max(1, Number(search.get("page") || 1) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(search.get("limit") || PAGE_SIZE) || PAGE_SIZE),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function searchFilter(q: string | null, fields: string[]) {
  const query = q?.trim();
  if (!query) return {};
  const regex = { $regex: escapeRegex(query), $options: "i" };
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

export function rangeFromRequest(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    q: searchParams.get("q"),
    role: searchParams.get("role"),
    category: searchParams.get("category"),
    ...paginationFromSearch(searchParams),
    createdAt: rangeFromSearch(searchParams),
  };
}

export async function parseExportBody(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    from?: string;
    to?: string;
    q?: string;
    role?: string;
    category?: string;
    fields?: string[];
    format?: "csv" | "xlsx";
  };
  return {
    from: body.from || null,
    to: body.to || null,
    q: body.q || null,
    role: body.role || null,
    category: body.category || null,
    fields: Array.isArray(body.fields) ? body.fields.map(String) : [],
    format: body.format === "xlsx" ? "xlsx" : "csv",
    createdAt: createdAtFilter({ from: body.from, to: body.to }),
  };
}
