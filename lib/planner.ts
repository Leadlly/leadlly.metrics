import type { Db, ObjectId } from "mongodb";
import { asId } from "@/lib/mappers";
import { istDayEnd, istDayStart, istNowYmd, istYmd } from "@/lib/ist";

const LOW_ACCURACY_MAX = 50;

export type PlannerTopicStatus = "completed" | "incomplete" | "pending";

export type PlannerTopic = {
  id: string;
  name: string;
  kind: "topic" | "subtopic";
  parentTopic: string;
  chapter: string;
  subject: string;
  accuracy: number;
  tag: string;
  status: PlannerTopicStatus;
  questions: number;
};

export type PlannerChapter = {
  id: string;
  name: string;
  subject: string;
};

export type PlannerDay = {
  id: string;
  date: string;
  day: string;
  isToday: boolean;
  dailyRevision: PlannerTopic[];
  pendingRevision: PlannerTopic[];
  accuracyRevision: PlannerTopic[];
  chapters: PlannerChapter[];
  completed: number;
  total: number;
};

export type StudentPlanner = {
  id: string;
  startDate: string;
  endDate: string;
  coversToday: boolean;
  today: PlannerDay | null;
  days: PlannerDay[];
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asList(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function named(value: unknown) {
  const record = asRecord(value);
  return {
    id: asId(record.id || record._id),
    name: String(record.name || "").trim(),
    accuracy: Number(record.overall_efficiency || 0),
  };
}

function questionCount(
  questions: Record<string, unknown>,
  names: Array<string | undefined>,
) {
  for (const name of names) {
    if (!name) continue;
    const items = questions[name];
    if (Array.isArray(items)) return items.length;
  }
  return 0;
}

function topicStatus(
  id: string,
  completed: Set<string>,
  incomplete: Set<string>,
): PlannerTopicStatus {
  if (id && completed.has(id)) return "completed";
  if (id && incomplete.has(id)) return "incomplete";
  return "pending";
}

function mapRevisionTopic(
  value: unknown,
  questions: Record<string, unknown>,
  completed: Set<string>,
  incomplete: Set<string>,
  asSubtopic = false,
): PlannerTopic | null {
  const row = asRecord(value);
  const topic = named(row.topic);
  const subtopic = named(row.subtopic);
  const chapter = named(row.chapter);
  const subject = named(row.subject);
  const name = asSubtopic ? subtopic.name || topic.name : topic.name;
  if (!name) return null;
  const id = asSubtopic ? subtopic.id || asId(row._id) : topic.id || asId(row._id);
  return {
    id: id || name,
    name,
    kind: asSubtopic ? "subtopic" : "topic",
    parentTopic: asSubtopic ? topic.name : "",
    chapter: chapter.name,
    subject: subject.name,
    accuracy: Math.round(
      asSubtopic ? subtopic.accuracy || topic.accuracy : topic.accuracy,
    ),
    tag: String(row.tag || ""),
    status: topicStatus(id, completed, incomplete),
    questions: questionCount(questions, [name, topic.name, subtopic.name]),
  };
}

function uniqueTopics(topics: PlannerTopic[]) {
  const seen = new Set<string>();
  return topics.filter((topic) => {
    const key = `${topic.kind}:${topic.id}:${topic.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mapDay(doc: Record<string, unknown>, today: string): PlannerDay {
  const questions = asRecord(doc.questions);
  const completed = new Set(asList(doc.completedTopics).map((item) => asId(item)));
  const incomplete = new Set(
    asList(doc.incompletedTopics).map((item) => asId(item)),
  );
  const dateValue = doc.date as Date | string | undefined;
  const date = dateValue ? istYmd(dateValue) : "";
  const dailyRevision = uniqueTopics([
    ...asList(doc.continuousRevisionTopics)
      .map((item) => mapRevisionTopic(item, questions, completed, incomplete))
      .filter((item): item is PlannerTopic => Boolean(item)),
    ...asList(doc.continuousRevisionSubTopics)
      .map((item) =>
        mapRevisionTopic(item, questions, completed, incomplete, true),
      )
      .filter((item): item is PlannerTopic => Boolean(item)),
  ]);
  const pendingRevision = uniqueTopics(
    asList(doc.backRevisionTopics)
      .map((item) => mapRevisionTopic(item, questions, completed, incomplete))
      .filter((item): item is PlannerTopic => Boolean(item)),
  );
  const accuracyRevision = uniqueTopics(
    asList(doc.lowAccuracyTopics)
      .map((item) => mapRevisionTopic(item, questions, completed, incomplete))
      .filter((item): item is PlannerTopic => Boolean(item)),
  );
  const chapters = asList(doc.chapters)
    .map((item) => {
      const row = asRecord(item);
      const name = String(row.name || "").trim();
      if (!name) return null;
      return {
        id: asId(row.id || row._id) || name,
        name,
        subject: String(row.subject || ""),
      };
    })
    .filter((item): item is PlannerChapter => Boolean(item));
  const allTopics = [...dailyRevision, ...pendingRevision, ...accuracyRevision];
  return {
    id: asId(doc._id) || date,
    date,
    day: String(doc.day || ""),
    isToday: date === today,
    dailyRevision,
    pendingRevision,
    accuracyRevision,
    chapters,
    completed: allTopics.filter((topic) => topic.status === "completed").length,
    total: allTopics.length,
  };
}

function topicKey(topic: PlannerTopic) {
  return topic.name.trim().toLowerCase();
}

function userMatch(userId: ObjectId, studentId: string) {
  return { $or: [{ user: userId }, { user: studentId }] };
}

async function accuracyFromStudyData(
  db: Db,
  userId: ObjectId,
  studentId: string,
  exclude: Set<string>,
) {
  const rows = await db
    .collection("studydatas")
    .find({
      ...userMatch(userId, studentId),
      "topic.overall_efficiency": { $gt: 0, $lt: LOW_ACCURACY_MAX },
    })
    .sort({ "topic.overall_efficiency": 1 })
    .limit(24)
    .toArray();

  return uniqueTopics(
    rows
      .map((row) =>
        mapRevisionTopic(row as Record<string, unknown>, {}, new Set(), new Set()),
      )
      .filter((item): item is PlannerTopic => Boolean(item))
      .filter((item) => !exclude.has(topicKey(item))),
  ).slice(0, 8);
}

export async function buildStudentPlanner(
  db: Db,
  userId: ObjectId,
  studentId: string,
): Promise<StudentPlanner | null> {
  const today = istNowYmd();
  const todayStart = istDayStart(today);
  const todayEnd = istDayEnd(today);
  const studentMatch = { $or: [{ student: userId }, { student: studentId }] };

  const covering = await db
    .collection("planners")
    .find({
      ...studentMatch,
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
    })
    .sort({ startDate: -1, createdAt: -1 })
    .limit(1)
    .toArray();

  const latest =
    covering[0] ||
    (
      await db
        .collection("planners")
        .find(studentMatch)
        .sort({ startDate: -1, createdAt: -1 })
        .limit(1)
        .toArray()
    )[0];

  if (!latest) return null;

  const days = asList(latest.days)
    .map((day) => mapDay(asRecord(day), today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayDay = days.find((day) => day.isToday) || null;
  const scheduledNames = new Set(
    [
      ...(todayDay?.dailyRevision || []),
      ...(todayDay?.pendingRevision || []),
      ...(todayDay?.accuracyRevision || []),
    ].map(topicKey),
  );

  let todayPayload = todayDay;
  if (todayDay && todayDay.accuracyRevision.length === 0) {
    const accuracyRevision = await accuracyFromStudyData(
      db,
      userId,
      studentId,
      scheduledNames,
    );
    const allTopics = [
      ...todayDay.dailyRevision,
      ...todayDay.pendingRevision,
      ...accuracyRevision,
    ];
    todayPayload = {
      ...todayDay,
      accuracyRevision,
      total: allTopics.length,
      completed: allTopics.filter((topic) => topic.status === "completed").length,
    };
  } else if (!todayDay) {
    const accuracyRevision = await accuracyFromStudyData(
      db,
      userId,
      studentId,
      new Set(),
    );
    if (accuracyRevision.length) {
      todayPayload = {
        id: "today",
        date: today,
        day: "Today",
        isToday: true,
        dailyRevision: [],
        pendingRevision: [],
        accuracyRevision,
        chapters: [],
        completed: 0,
        total: accuracyRevision.length,
      };
    }
  }

  if (!todayPayload) {
    todayPayload = {
      id: "today",
      date: today,
      day: "Today",
      isToday: true,
      dailyRevision: [],
      pendingRevision: [],
      accuracyRevision: [],
      chapters: [],
      completed: 0,
      total: 0,
    };
  }

  return {
    id: asId(latest._id),
    startDate: latest.startDate ? istYmd(latest.startDate as Date) : days[0]?.date || "",
    endDate: latest.endDate
      ? istYmd(latest.endDate as Date)
      : days[days.length - 1]?.date || "",
    coversToday: Boolean(todayDay),
    today: todayPayload,
    days,
  };
}
