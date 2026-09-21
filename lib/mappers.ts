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
        report?: {
          dailyReport?: {
            date?: Date | string;
            session?: number;
            quiz?: number;
            overall?: number;
          };
        };
      }
    | undefined;
  const about = doc.about as { gender?: string; dateOfBirth?: string } | undefined;
  const lastActivity =
    (doc.updatedAt as Date | undefined) ||
    details?.streak?.updatedAt ||
    (doc.createdAt as Date | undefined);
  const daily = details?.report?.dailyReport;

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
    onboard: doc.onboard === true,
    dailyReportDate: daily?.date,
    dailyReportSession: Number(daily?.session || 0),
    dailyReportQuiz: Number(daily?.quiz || 0),
    dailyReportOverall: Number(daily?.overall || 0),
  };
}

export type StudentRow = ReturnType<typeof mapStudent>;

type SubjectDoc = {
  name?: string;
  overall_efficiency?: number;
  overall_progress?: number;
  total_questions_solved?: { number?: number; percentage?: number };
};

export function mapStudentDetail(doc: Record<string, unknown>) {
  const base = mapStudent(doc);
  const academic = doc.academic as Record<string, unknown> | undefined;
  const about = doc.about as { gender?: string; dateOfBirth?: string } | undefined;
  const address = doc.address as
    | { country?: string; addressLine?: string; pincode?: number | string }
    | undefined;
  const phone = doc.phone as
    | { personal?: number | string; other?: number | string }
    | undefined;
  const avatar = doc.avatar as { url?: string } | undefined;
  const subscription = doc.subscription as
    | {
        status?: string;
        planId?: string;
        dateOfActivation?: Date;
        dateOfDeactivation?: Date;
      }
    | undefined;
  const freeTrial = doc.freeTrial as
    | {
        active?: boolean;
        availed?: boolean;
        dateOfActivation?: Date;
        dateOfDeactivation?: Date;
      }
    | undefined;
  const subjects = Array.isArray(academic?.subjects)
    ? (academic.subjects as SubjectDoc[])
    : [];

  return {
    ...base,
    avatar: String(avatar?.url || ""),
    dob: String(about?.dateOfBirth || ""),
    phoneOther: phone?.other == null ? "" : String(phone.other),
    addressLine: String(address?.addressLine || ""),
    pincode: address?.pincode == null ? "" : String(address.pincode),
    country: String(address?.country || ""),
    schedule: String(academic?.schedule || ""),
    coachingAddress: String(academic?.coachingAddress || ""),
    schoolAddress: String(academic?.schoolOrCollegeAddress || ""),
    subscriptionActivated: subscription?.dateOfActivation,
    subscriptionDeactivated: subscription?.dateOfDeactivation,
    freeTrialActivated: freeTrial?.dateOfActivation,
    freeTrialDeactivated: freeTrial?.dateOfDeactivation,
    subjects: subjects.map((subject) => ({
      name: String(subject.name || "Subject"),
      efficiency: Number(subject.overall_efficiency || 0),
      progress: Number(subject.overall_progress || 0),
      questionsSolved: Number(subject.total_questions_solved?.number || 0),
    })),
  };
}

export type StudentDetail = ReturnType<typeof mapStudentDetail>;

export function mapTracker(doc: Record<string, unknown>) {
  const subject = doc.subject as { name?: string } | string | undefined;
  const chapter = doc.chapter as
    | {
        name?: string;
        overall_efficiency?: number;
        overall_progress?: number;
        total_questions_solved?: { number?: number };
      }
    | undefined;
  const topics = Array.isArray(doc.topics) ? doc.topics : [];
  return {
    id: asId(doc._id),
    subject:
      typeof subject === "string" ? subject : String(subject?.name || ""),
    chapter: String(chapter?.name || ""),
    efficiency: Number(chapter?.overall_efficiency || 0),
    progress: Number(chapter?.overall_progress || 0),
    questionsSolved: Number(chapter?.total_questions_solved?.number || 0),
    topics: topics.length,
  };
}

export type TrackerRow = ReturnType<typeof mapTracker>;

export function parseObjectId(id: string) {
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
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
