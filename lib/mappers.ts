import { ObjectId } from "mongodb";

export function coachingName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name?: string }).name || "");
  }
  return "";
}

export function asId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === "object" && value !== null && "$oid" in value) {
    return String((value as { $oid: string }).$oid);
  }
  return String(value);
}

export function mapStudent(doc: Record<string, unknown>) {
  const phone = (doc.phone as { personal?: number | string } | undefined)
    ?.personal;
  const parent = doc.parent as { name?: string; phone?: number | string } | undefined;
  const academic = doc.academic as Record<string, unknown> | undefined;
  const institute = doc.institute as { name?: string } | undefined;
  const subscription = doc.subscription as
    | { status?: string; planId?: string }
    | undefined;
  const freeTrial = doc.freeTrial as
    | { active?: boolean; availed?: boolean }
    | undefined;
  const details = doc.details as
    | {
        level?: { number?: number };
        points?: { number?: number };
        streak?: { number?: number; updatedAt?: Date };
      }
    | undefined;
  const about = doc.about as { gender?: string } | undefined;
  const lastActivity =
    (doc.updatedAt as Date | undefined) ||
    details?.streak?.updatedAt ||
    (doc.createdAt as Date | undefined);

  return {
    id: asId(doc._id),
    firstname: String(doc.firstname || ""),
    lastname: String(doc.lastname || ""),
    email: String(doc.email || ""),
    phone: phone == null ? "" : String(phone),
    parentName: parent?.name || "",
    parentPhone: parent?.phone == null ? "" : String(parent.phone),
    category: String(doc.category || "free"),
    standard: academic?.standard == null ? "" : String(academic.standard),
    exam: String(academic?.competitiveExam || ""),
    school: String(academic?.schoolOrCollegeName || ""),
    coaching: coachingName(academic?.coachingName),
    institute: String(institute?.name || ""),
    subscription: String(subscription?.status || "none"),
    planId: String(subscription?.planId || ""),
    freeTrial: freeTrial?.active
      ? "active"
      : freeTrial?.availed
        ? "availed"
        : "none",
    level: details?.level?.number ?? 1,
    points: details?.points?.number ?? 0,
    streak: details?.streak?.number ?? 0,
    gender: String(about?.gender || ""),
    createdAt: doc.createdAt as Date | undefined,
    lastActivity,
    disabled: Boolean(doc.disabled),
  };
}

export function mapTeacher(doc: Record<string, unknown>) {
  const phone = (doc.phone as { personal?: number | string } | undefined)
    ?.personal;
  const students = Array.isArray(doc.students) ? doc.students : [];
  const institutes = Array.isArray(doc.institutes) ? doc.institutes : [];
  const subjects = Array.isArray(doc.subjects) ? doc.subjects : [];

  return {
    id: asId(doc._id),
    firstname: String(doc.firstname || ""),
    lastname: String(doc.lastname || ""),
    email: String(doc.email || ""),
    phone: phone == null ? "" : String(phone),
    role: String(doc.role || "teacher"),
    status: String(doc.status || "Not Verified"),
    teacherCode: String(doc.teacherCode || ""),
    subjects: subjects.map(String).filter(Boolean).join(", "),
    studentCount: students.length,
    instituteCount: institutes.length + (doc.institute ? 1 : 0),
    isBlocked: Boolean(doc.isBlocked),
    createdAt: doc.createdAt as Date | undefined,
  };
}

export function mapInstitute(
  doc: Record<string, unknown>,
  counts?: { students?: number; teachers?: number; batches?: number },
) {
  return {
    id: asId(doc._id),
    name: String(doc.name || ""),
    instituteCode: String(doc.instituteCode || ""),
    email: String(doc.email || ""),
    contactNumber: String(doc.contactNumber || ""),
    city: String(doc.city || ""),
    state: String(doc.state || ""),
    website: String(doc.website || ""),
    students: counts?.students ?? 0,
    teachers: counts?.teachers ?? 0,
    batches: counts?.batches ?? 0,
    createdAt: doc.createdAt as Date | undefined,
  };
}
