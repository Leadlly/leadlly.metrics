import type { Db, ObjectId } from "mongodb";
import { asId } from "@/lib/mappers";
import {
  addYmd,
  istDayEnd,
  istDayStart,
  istIsoWeekStartYmd,
  istNowYmd,
  istYmd,
  weekdayFromYmd,
} from "@/lib/ist";

export type PlannerTopicStatus = "completed" | "incomplete" | "pending" | "skipped";
export type PlannerLane = "CURRENT_LEARNING" | "ACCURACY" | "PAST_REVISION";

export type PlannerTopic = {
  id: string;
  itemId: string;
  name: string;
  kind: "topic" | "subtopic";
  parentTopic: string;
  chapter: string;
  subject: string;
  accuracy: number;
  mastery: number;
  tag: PlannerLane | string;
  status: PlannerTopicStatus;
  questions: number;
  reason: string;
  quizId: string | null;
};

export type PlannerChapter = {
  id: string;
  name: string;
  subject: string;
  attempted: boolean;
  endDate: string;
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
  algorithmVersion: string;
  today: PlannerDay | null;
  days: PlannerDay[];
  weeklyQuiz: {
    id: string;
    attempted: boolean;
    endDate: string;
  } | null;
};

type TopicStateRow = {
  topicId?: string;
  mastery?: number;
  lastQuizAccuracy?: number | null;
  recentAccuracy?: number | null;
  rawAccuracy?: number;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function statusFromItem(status: unknown): PlannerTopicStatus {
  const value = String(status || "PENDING").toUpperCase();
  if (value === "COMPLETED") return "completed";
  if (value === "OPENED") return "incomplete";
  if (value === "SKIPPED" || value === "EXPIRED") return "skipped";
  return "pending";
}

function laneFromItem(item: Record<string, unknown>): PlannerLane {
  const lane = String(item.lane || "").toUpperCase();
  if (lane === "CURRENT_LEARNING" || lane === "ACCURACY" || lane === "PAST_REVISION") {
    return lane;
  }
  const sources = Array.isArray(item.sources) ? item.sources.map(String) : [];
  if (sources.includes("CURRENT_LEARNING")) return "CURRENT_LEARNING";
  if (sources.includes("ACCURACY")) return "ACCURACY";
  return "PAST_REVISION";
}

function accuracyFromState(state?: TopicStateRow) {
  if (!state) return 0;
  const quiz = Number(state.lastQuizAccuracy ?? state.recentAccuracy ?? 0);
  if (quiz > 0) return Math.round(quiz);
  const mastery = Number(state.mastery || 0);
  if (mastery > 0) return Math.round(mastery);
  return Math.round(Number(state.rawAccuracy || 0));
}

function mapItem(
  doc: Record<string, unknown>,
  states: Map<string, TopicStateRow>,
): PlannerTopic | null {
  const topicId = String(doc.topicId || "").trim();
  const topicName = String(doc.topicName || "").trim();
  if (!topicId && !topicName) return null;
  const status = statusFromItem(doc.status);
  if (status === "skipped") return null;
  const state = states.get(topicId);
  const questionIds = Array.isArray(doc.questionIds) ? doc.questionIds : [];
  const granularity = String(doc.granularity || "topic");
  return {
    id: topicId || asId(doc._id),
    itemId: asId(doc._id),
    name: topicName || topicId,
    kind: granularity === "subtopic" ? "subtopic" : "topic",
    parentTopic: "",
    chapter: String(doc.chapterName || ""),
    subject: String(doc.subject || ""),
    accuracy: accuracyFromState(state),
    mastery: Math.round(Number(state?.mastery || 0)),
    tag: laneFromItem(doc),
    status,
    questions: questionIds.length,
    reason: String(doc.reason || ""),
    quizId: doc.quizId ? asId(doc.quizId) : null,
  };
}

function emptyDay(ymd: string, today: string): PlannerDay {
  return {
    id: ymd,
    date: ymd,
    day: weekdayFromYmd(ymd),
    isToday: ymd === today,
    dailyRevision: [],
    pendingRevision: [],
    accuracyRevision: [],
    chapters: [],
    completed: 0,
    total: 0,
  };
}

function finalizeDay(day: PlannerDay): PlannerDay {
  const all = [...day.dailyRevision, ...day.pendingRevision, ...day.accuracyRevision];
  return {
    ...day,
    completed: all.filter((topic) => topic.status === "completed").length,
    total: all.length,
  };
}

function userMatch(userId: ObjectId, studentId: string) {
  return { $or: [{ user: userId }, { user: studentId }] };
}

export async function buildStudentPlanner(
  db: Db,
  userId: ObjectId,
  studentId: string,
): Promise<StudentPlanner | null> {
  const today = istNowYmd();
  const rangeStart = addYmd(istIsoWeekStartYmd(today), -7);
  const rangeEnd = today;
  const match = userMatch(userId, studentId);

  const [items, topicStates, weeklyQuizRows, chapterQuizzes] = await Promise.all([
    db
      .collection("planneritems")
      .find({
        ...match,
        date: {
          $gte: istDayStart(rangeStart),
          $lte: istDayEnd(rangeEnd),
        },
      })
      .sort({ date: 1, sequence: 1 })
      .toArray(),
    db
      .collection("topicstates")
      .find(match)
      .project({
        topicId: 1,
        mastery: 1,
        lastQuizAccuracy: 1,
        recentAccuracy: 1,
        rawAccuracy: 1,
      })
      .toArray(),
    db
      .collection("quizzes")
      .find({
        ...match,
        quizType: "weekly",
        createdAt: { $gte: istDayStart(istIsoWeekStartYmd(today)) },
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .project({ _id: 1, endDate: 1, attempted: 1 })
      .toArray(),
    db
      .collection("quizzes")
      .find({
        ...match,
        quizType: "chapter",
        endDate: { $gte: new Date() },
      })
      .sort({ createdAt: -1 })
      .limit(8)
      .project({ _id: 1, endDate: 1, attempted: 1, chapter: 1 })
      .toArray(),
  ]);

  const weeklyQuizDoc = weeklyQuizRows[0];

  if (!items.length && !weeklyQuizDoc && !chapterQuizzes.length) {
    return null;
  }

  const states = new Map<string, TopicStateRow>();
  for (const row of topicStates) {
    const topicId = String((row as TopicStateRow).topicId || "");
    if (topicId) states.set(topicId, row as TopicStateRow);
  }

  const byDay = new Map<string, PlannerDay>();
  for (const raw of items) {
    const doc = raw as Record<string, unknown>;
    if (!doc.date) continue;
    const ymd = istYmd(doc.date as Date | string);
    if (ymd < rangeStart || ymd > rangeEnd) continue;
    const topic = mapItem(doc, states);
    if (!topic) continue;
    const day = byDay.get(ymd) || emptyDay(ymd, today);
    if (topic.tag === "CURRENT_LEARNING") day.dailyRevision.push(topic);
    else if (topic.tag === "ACCURACY") day.accuracyRevision.push(topic);
    else day.pendingRevision.push(topic);
    byDay.set(ymd, day);
  }

  const chapters: PlannerChapter[] = chapterQuizzes.map((quiz) => {
    const chapter = asRecord(quiz.chapter);
    return {
      id: asId(quiz._id),
      name: String(chapter.name || "Chapter quiz"),
      subject: String(chapter.subject || ""),
      attempted: Boolean(quiz.attempted),
      endDate: quiz.endDate ? istYmd(quiz.endDate as Date) : "",
    };
  });

  const days = Array.from(byDay.values())
    .map(finalizeDay)
    .sort((a, b) => a.date.localeCompare(b.date));

  let todayDay = days.find((day) => day.isToday) || null;
  if (todayDay) {
    todayDay = finalizeDay({ ...todayDay, chapters });
  } else if (chapters.length) {
    todayDay = finalizeDay({ ...emptyDay(today, today), chapters });
  } else {
    todayDay = finalizeDay(emptyDay(today, today));
  }

  const startDate = days[0]?.date || rangeStart;
  const endDate = days[days.length - 1]?.date || today;

  return {
    id: `planner-v1:${studentId}`,
    startDate,
    endDate,
    coversToday: Boolean(byDay.get(today)),
    algorithmVersion: "planner-v1",
    today: todayDay,
    days: days.map((day) =>
      day.isToday ? finalizeDay({ ...day, chapters }) : day,
    ),
    weeklyQuiz: weeklyQuizDoc
      ? {
          id: asId(weeklyQuizDoc._id),
          attempted: Boolean(weeklyQuizDoc.attempted),
          endDate: weeklyQuizDoc.endDate
            ? istYmd(weeklyQuizDoc.endDate as Date)
            : "",
        }
      : null,
  };
}
