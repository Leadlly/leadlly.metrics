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

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "authenticated"];

export function applyStudentPlanFilter(
  match: Record<string, unknown>,
  category?: string | null,
) {
  if (!category || category === "all") return match;
  if (category === "subscription") {
    match["subscription.status"] = { $in: ACTIVE_SUBSCRIPTION_STATUSES };
    return match;
  }
  if (category === "free") {
    match["subscription.status"] = { $nin: ACTIVE_SUBSCRIPTION_STATUSES };
    return match;
  }
  return match;
}

export function applyOnboardFilter(
  match: Record<string, unknown>,
  onboard?: string | null,
) {
  if (!onboard || onboard === "all") return match;
  if (onboard === "generated") {
    match.onboard = true;
    return match;
  }
  if (onboard === "missing") {
    match.onboard = { $ne: true };
    return match;
  }
  return match;
}

export function rangeFromRequest(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  return {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    q: searchParams.get("q"),
    role: searchParams.get("role"),
    category: searchParams.get("category"),
    onboard: searchParams.get("onboard"),
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
    onboard?: string;
    fields?: string[];
    format?: "csv" | "xlsx";
  };
  return {
    from: body.from || null,
    to: body.to || null,
    q: body.q || null,
    role: body.role || null,
    category: body.category || null,
    onboard: body.onboard || null,
    fields: Array.isArray(body.fields) ? body.fields.map(String) : [],
    format: body.format === "xlsx" ? "xlsx" : "csv",
    createdAt: createdAtFilter({ from: body.from, to: body.to }),
  };
}
