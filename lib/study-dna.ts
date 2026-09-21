import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { ObjectId, type Db } from "mongodb";
import { getQuestionsDb } from "@/lib/mongodb";

const CHAPTER_STATUS = {
  STRONGLY_COMPLETED: "strongly_completed",
  COMPLETED_NEEDS_REVISION: "completed_needs_revision",
  COMPLETED_BACKLOG: "completed_backlog",
  ONGOING: "ongoing",
  NOT_STARTED: "not_started",
} as const;

const CHAPTER_STATUSES = Object.values(CHAPTER_STATUS);

type StudyCheckAnswers = {
  exams: string[];
  academicStage: string | null;
  board: string | null;
  coachingAttendance: string | null;
  classStartTime: string | null;
  classEndTime: string | null;
  coachingHours: number;
  wakeTime: string | null;
  sleepTime: string | null;
  selfStudyBand: string | null;
  studySlots: Array<{ id: string; label: string; start: string; end: string }>;
  decideHow: string | null;
  missedPlan: string | null;
  afterTopic: string | null;
  reviseHow: string | null;
  wrongQuestion: string | null;
  backlog: string | null;
  coverage: Record<string, unknown> | null;
  hasPeriodicTests: boolean | null;
  tests: Array<{
    id: string;
    name: string;
    date: string;
    type: string;
    syllabus: string;
  }>;
  draftTest: {
    name: string;
    date: string | null;
    type: string;
    syllabusPicks: Array<{ subject: string; chapter: string }>;
  };
  biggestProblems: string[];
};

const emptyAnswers = (): StudyCheckAnswers => ({
  exams: [],
  academicStage: null,
  board: null,
  coachingAttendance: null,
  classStartTime: null,
  classEndTime: null,
  coachingHours: 0,
  wakeTime: null,
  sleepTime: null,
  selfStudyBand: null,
  studySlots: [],
  decideHow: null,
  missedPlan: null,
  afterTopic: null,
  reviseHow: null,
  wrongQuestion: null,
  backlog: null,
  coverage: null,
  hasPeriodicTests: null,
  tests: [],
  draftTest: { name: "", date: null, type: "periodic", syllabusPicks: [] },
  biggestProblems: [],
});

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function answersFromDoc(doc: Record<string, unknown>): StudyCheckAnswers {
  const goal = asRecord(doc.goal);
  const classes = asRecord(doc.classes);
  const day = asRecord(doc.day);
  const habits = asRecord(doc.habits);
  const syllabus = asRecord(doc.syllabus);
  const tests = asRecord(doc.tests);
  const problems = asRecord(doc.problems);
  const draft = asRecord(tests.draft);
  return {
    exams: Array.isArray(goal.exams) ? goal.exams.map(String) : [],
    academicStage: goal.academicStage == null ? null : String(goal.academicStage),
    board: goal.board == null ? null : String(goal.board),
    coachingAttendance:
      classes.coachingAttendance == null ? null : String(classes.coachingAttendance),
    classStartTime: classes.classStartTime == null ? null : String(classes.classStartTime),
    classEndTime: classes.classEndTime == null ? null : String(classes.classEndTime),
    coachingHours: Number(classes.coachingHours || 0),
    wakeTime: day.wakeTime == null ? null : String(day.wakeTime),
    sleepTime: day.sleepTime == null ? null : String(day.sleepTime),
    selfStudyBand: day.selfStudyBand == null ? null : String(day.selfStudyBand),
    studySlots: Array.isArray(day.studySlots)
      ? day.studySlots.map((slot) => {
          const row = asRecord(slot);
          return {
            id: String(row.id || ""),
            label: String(row.label || ""),
            start: String(row.start || ""),
            end: String(row.end || ""),
          };
        })
      : [],
    decideHow: habits.decideHow == null ? null : String(habits.decideHow),
    missedPlan: habits.missedPlan == null ? null : String(habits.missedPlan),
    afterTopic: habits.afterTopic == null ? null : String(habits.afterTopic),
    reviseHow: habits.reviseHow == null ? null : String(habits.reviseHow),
    wrongQuestion: habits.wrongQuestion == null ? null : String(habits.wrongQuestion),
    backlog: habits.backlog == null ? null : String(habits.backlog),
    coverage: (syllabus.coverage as Record<string, unknown> | null) ?? null,
    hasPeriodicTests:
      typeof tests.hasPeriodicTests === "boolean" ? tests.hasPeriodicTests : null,
    tests: Array.isArray(tests.items)
      ? tests.items.map((item) => {
          const row = asRecord(item);
          return {
            id: String(row.id || ""),
            name: String(row.name || ""),
            date: String(row.date || ""),
            type: String(row.type || "periodic"),
            syllabus: String(row.syllabus || ""),
          };
        })
      : [],
    draftTest: {
      name: String(draft.name || ""),
      date: draft.date == null ? null : String(draft.date),
      type: String(draft.type || "periodic"),
      syllabusPicks: Array.isArray(draft.syllabusPicks)
        ? draft.syllabusPicks.map((pick) => {
            const row = asRecord(pick);
            return {
              subject: String(row.subject || ""),
              chapter: String(row.chapter || ""),
            };
          })
        : [],
    },
    biggestProblems: Array.isArray(problems.biggestProblems)
      ? problems.biggestProblems.map(String)
      : [],
  };
}

const EXAM_LABELS: Record<string, string> = {
  jee: "JEE",
  neet: "NEET",
  boards: "Boards",
  jee_main: "JEE",
  jee_advanced: "JEE",
  jee_boards: "JEE",
  neet_boards: "NEET",
  other: "Boards",
};

const STAGE_LABELS: Record<string, string> = {
  "11": "Class 11",
  "12": "Class 12",
  drop: "Drop Year",
  other: "Other",
};

const HABIT_OPTIONS: Record<string, string[]> = {
  decideHow: ["clear_plan", "rough_idea", "decide_as_i_go", "no_plan"],
  missedPlan: ["almost_always", "most_days", "some_days", "rarely"],
  afterTopic: ["revision_cycle", "revise_soon", "before_test", "rarely_revisit"],
  reviseHow: ["fixed_cycle", "when_time", "before_tests", "no_system"],
  wrongQuestion: ["fix_it", "understand", "mark_it", "move_on"],
  backlog: ["adjust", "catch_up", "push_forward", "piles_up"],
};

const HABIT_SCORES = [100, 75, 50, 25];

const HABIT_CHOICE_LABEL: Record<string, string> = {
  clear_plan: "a clear plan",
  rough_idea: "a rough idea",
  decide_as_i_go: "deciding as you go",
  no_plan: "no set plan",
  almost_always: "almost always",
  most_days: "most days",
  some_days: "some days",
  rarely: "rarely",
  revision_cycle: "a regular revision cycle",
  revise_soon: "revising soon after",
  before_test: "waiting until a test",
  rarely_revisit: "rarely revisiting topics",
  fixed_cycle: "a fixed revision cycle",
  when_time: "revising when you have time",
  before_tests: "revising before tests",
  no_system: "no revision system",
  fix_it: "you go back and fix it",
  understand: "you try to understand it",
  mark_it: "you mark it and move on",
  move_on: "you move on",
  adjust: "you adjust the plan",
  catch_up: "you try to catch up later",
  push_forward: "you push new work forward",
  piles_up: "backlog piles up",
};

const describeHabit = (value?: string | null) => {
  if (!value) return null;
  const parts = value.split("~").map(
    (part) => HABIT_CHOICE_LABEL[part] || part.replace(/_/g, " ")
  );
  if (parts.length === 2) return `between ${parts[0]} and ${parts[1]}`;
  return parts[0];
};

const SELF_STUDY_BAND_HOURS: Record<string, number> = {
  lt2: 1.5,
  "2to4": 3,
  "4to6": 5,
  "6to8": 7,
  "8plus": 8,
};

const SELF_STUDY_BAND_LABEL: Record<string, string> = {
  lt2: "Less than 2 hrs",
  "2to4": "2-4 hrs",
  "4to6": "4-6 hrs",
  "6to8": "6-8 hrs",
  "8plus": "8+ hrs",
};

const BREAKDOWN = [
  {
    key: CHAPTER_STATUS.STRONGLY_COMPLETED,
    label: "Strongly completed",
    color: "#86EFAC",
  },
  {
    key: CHAPTER_STATUS.COMPLETED_NEEDS_REVISION,
    label: "Needs revision",
    color: "#FDE68A",
  },
  {
    key: CHAPTER_STATUS.COMPLETED_BACKLOG,
    label: "Completed + backlog",
    color: "#FDBA74",
  },
  { key: CHAPTER_STATUS.ONGOING, label: "Ongoing", color: "#93C5FD" },
  { key: CHAPTER_STATUS.NOT_STARTED, label: "Not started", color: "#E5E7EB" },
] as const;

const PROBLEM_FOCUS: Record<string, { title: string; body: string; icon: string }> =
  {
    what_to_study: {
      title: "Daily plan",
      body: "Know exactly what to study each day.",
      icon: "target",
    },
    consistency: {
      title: "Protect consistency",
      body: "Make the plan happen on more days.",
      icon: "zap",
    },
    backlog: {
      title: "Clear backlog",
      body: "Finish carried chapters without stalling new ones.",
      icon: "layers",
    },
    revise: {
      title: "Rebuild revision",
      body: "Bring completed topics back before they fade.",
      icon: "refresh-cw",
    },
    forget: {
      title: "Lock in memory",
      body: "Revisit what you studied before it slips.",
      icon: "aperture",
    },
    practice: {
      title: "Fix repeated errors",
      body: "Turn missed questions into a practice loop.",
      icon: "aperture",
    },
    manage_time: {
      title: "Guard the study window",
      body: "Protect self-study around coaching hours.",
      icon: "clock",
    },
    where_i_stand: {
      title: "Map the syllabus",
      body: "See what's locked in versus still open.",
      icon: "map",
    },
    scores: {
      title: "Convert hours to scores",
      body: "Practice the chapters that move marks.",
      icon: "trending-up",
    },
    accountability: {
      title: "Daily check-in",
      body: "Keep a simple loop so the plan doesn't drift.",
      icon: "check-circle",
    },
    other: {
      title: "Your focus",
      body: "Work the challenge you called out.",
      icon: "flag",
    },
  };

type HabitAnswers = {
  decideHow?: string | null;
  missedPlan?: string | null;
  afterTopic?: string | null;
  reviseHow?: string | null;
  wrongQuestion?: string | null;
  backlog?: string | null;
};

type ChapterRow = {
  id: string;
  status: string;
  name: string;
  subject: string;
  standard: number;
  tagged?: boolean;
};

const titleCase = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const hoursBetweenClocks = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  if (
    [startHour, startMinute, endHour, endMinute].some((value) =>
      Number.isNaN(value)
    )
  ) {
    return 0;
  }
  const startMinutes = startHour * 60 + startMinute;
  let endMinutes = endHour * 60 + endMinute;
  if (endMinutes === startMinutes) return 0;
  if (endMinutes < startMinutes) endMinutes += 24 * 60;
  return Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
};

const formatClock = (value?: string | null) => {
  if (!value) return "-";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

const clockMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

const formatHrs = (hours: number) => {
  if (!hours) return "0 hrs";
  const rounded = Math.round(hours * 10) / 10;
  if (rounded === 1) return "1 hr";
  return Number.isInteger(rounded) ? `${rounded} hrs` : `${rounded} hrs`;
};

const formatHm = (hours: number) => {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const examSummary = (exams: string[]) => {
  if (!exams.length) return "Your exam";
  return exams.map((exam) => EXAM_LABELS[exam] || titleCase(exam)).join(" + ");
};

const examFamily = (exams: string[]) => {
  if (exams.some((exam) => exam.includes("neet"))) return "NEET";
  if (exams.some((exam) => exam.includes("jee"))) return "JEE";
  if (exams.includes("boards")) return "Boards";
  return examSummary(exams);
};

const classLabel = (stage?: string | null, standard?: number | null) => {
  if (stage && STAGE_LABELS[stage]) return STAGE_LABELS[stage];
  if (standard === 11) return "Class 11";
  if (standard === 12) return "Class 12";
  if (standard === 13) return "Drop Year";
  return "Class";
};

const scoreHabit = (value: string | null | undefined, keys: string[]) => {
  if (!value) return 0;
  const exact = keys.indexOf(value);
  if (exact >= 0) return HABIT_SCORES[exact];
  if (value.includes("~")) {
    const [left, right] = value.split("~");
    const i = keys.indexOf(left);
    const j = keys.indexOf(right);
    if (i >= 0 && j >= 0) {
      return Math.round((HABIT_SCORES[i] + HABIT_SCORES[j]) / 2);
    }
  }
  return 0;
};

const signalBand = (score: number, weakest: boolean) => {
  if (weakest && score < 55) return { label: "Weakest", color: "#FCA5A5" };
  if (score >= 75) return { label: "Strong", color: "#86EFAC" };
  if (score >= 55) return { label: "Steady", color: "#C4B5FD" };
  if (score >= 40) return { label: "Attention", color: "#FDBA74" };
  return { label: "Weakest", color: "#FCA5A5" };
};

const chapterNameKey = (subject: string, name: string, standard?: number) =>
  `${subject.toLowerCase()}::${name.trim().toLowerCase()}::${standard || ""}`;

const uniqueChapters = (
  rows: Array<{
    status?: string | null;
    chapter?: { id?: unknown; name?: string };
    subject?: { name?: string };
    standard?: number;
  }>
): ChapterRow[] => {
  const byId = new Map<string, ChapterRow>();
  const byName = new Map<string, string>();
  for (const row of rows) {
    const name = row.chapter?.name || "";
    const subject = row.subject?.name || "";
    if (!name && !row.chapter?.id) continue;
    const nameKey = chapterNameKey(subject, name, row.standard);
    const id = row.chapter?.id ? String(row.chapter.id) : nameKey;
    if (byId.has(id)) continue;
    const existingId = byName.get(nameKey);
    if (existingId && byId.has(existingId)) continue;
    byId.set(id, {
      id,
      status: row.status || CHAPTER_STATUS.NOT_STARTED,
      name,
      subject,
      standard: row.standard || 0,
    });
    if (nameKey) byName.set(nameKey, id);
  }
  return [...byId.values()];
};

const examTagsFor = (competitiveExam?: string | null, exams: string[] = []) => {
  const exam = String(competitiveExam || "").toLowerCase();
  if (exam.includes("jee") || exams.some((item) => item.includes("jee"))) {
    return ["jeemains", "jeeadvance"];
  }
  if (exam.includes("neet") || exams.some((item) => item.includes("neet"))) {
    return ["neet"];
  }
  if (exam.includes("board") || exams.includes("boards")) {
    return ["boards"];
  }
  return [];
};

const syllabusStandards = (standard?: number | null) => {
  if (standard === 12 || standard === 13) return [11, 12];
  if (standard === 11) return [11];
  return [11, 12];
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const loadSyllabusChapters = async ({
  subjects,
  standard,
  examTags,
}: {
  subjects: string[];
  standard?: number | null;
  examTags: string[];
}) => {
  if (!subjects.length) return [];

  const db = await getQuestionsDb();
  if (!db) return [];
  const collection = db.collection("chapters");
  const subjectQuery = {
    subjectName: {
      $in: subjects.map((name) => new RegExp(`^${escapeRegex(name)}$`, "i")),
    },
    standard: { $in: syllabusStandards(standard) },
  };
  const projection = { _id: 1, name: 1, subjectName: 1, standard: 1 };

  let chapters = await collection
    .find({
      ...subjectQuery,
      ...(examTags.length ? { exam: { $in: examTags } } : {}),
    })
    .project(projection)
    .toArray();

  if (!chapters.length && examTags.length) {
    chapters = await collection.find(subjectQuery).project(projection).toArray();
  }

  const unique = new Map<string, (typeof chapters)[number]>();
  for (const chapter of chapters) {
    const subject = String(chapter.subjectName || "").toLowerCase();
    const name = String(chapter.name || "").trim().toLowerCase();
    const key = `${subject}::${name}::${chapter.standard ?? ""}`;
    if (!subject || !name || unique.has(key)) continue;
    unique.set(key, chapter);
  }
  return [...unique.values()];
};

const mergeSyllabusWithTagged = (
  syllabus: Array<{
    _id?: unknown;
    name?: string;
    subjectName?: string;
    standard?: number;
  }>,
  tagged: ChapterRow[]
): ChapterRow[] => {
  const byId = new Map(tagged.map((row) => [row.id, row]));
  const byName = new Map(
    tagged.map((row) => [
      chapterNameKey(row.subject, row.name, row.standard),
      row,
    ])
  );
  const used = new Set<string>();

  const merged = syllabus.map((chapter) => {
    const id = chapter._id ? String(chapter._id) : "";
    const name = String(chapter.name || "");
    const subject = String(chapter.subjectName || "");
    const standard = Number(chapter.standard || 0);
    const taggedRow =
      (id && byId.get(id)) ||
      byName.get(chapterNameKey(subject, name, standard));
    if (taggedRow) {
      used.add(taggedRow.id);
      used.add(chapterNameKey(taggedRow.subject, taggedRow.name, taggedRow.standard));
    }
    return {
      id: taggedRow?.id || id,
      status: taggedRow?.status || CHAPTER_STATUS.NOT_STARTED,
      name,
      subject,
      standard: Number(chapter.standard || taggedRow?.standard || 0),
      tagged: Boolean(taggedRow),
    };
  });

  for (const row of tagged) {
    const nameKey = chapterNameKey(row.subject, row.name, row.standard);
    if (used.has(row.id) || used.has(nameKey)) continue;
    merged.push({ ...row, tagged: true });
  }

  return merged;
};

const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;

const buildSignals = (
  habits: HabitAnswers,
  chapterStats: {
    total: number;
    covered: number;
    locked: number;
    backlog: number;
  }
) => {
  const revisionHabit = scoreHabit(
    habits.afterTopic || habits.reviseHow,
    habits.afterTopic ? HABIT_OPTIONS.afterTopic : HABIT_OPTIONS.reviseHow
  );
  const revisionScore =
    chapterStats.covered > 0
      ? percent(chapterStats.locked, chapterStats.covered)
      : revisionHabit;
  const backlogScore =
    chapterStats.total > 0
      ? percent(chapterStats.total - chapterStats.backlog, chapterStats.total)
      : scoreHabit(habits.backlog, HABIT_OPTIONS.backlog);

  const items = [
    {
      key: "planning",
      label: "Planning",
      icon: "target",
      score: scoreHabit(habits.decideHow, HABIT_OPTIONS.decideHow),
    },
    {
      key: "consistency",
      label: "Consistency",
      icon: "zap",
      score: scoreHabit(habits.missedPlan, HABIT_OPTIONS.missedPlan),
    },
    {
      key: "revision",
      label: "Revision",
      icon: "refresh-cw",
      score: revisionScore,
    },
    {
      key: "accuracy",
      label: "Accuracy",
      icon: "aperture",
      score: scoreHabit(habits.wrongQuestion, HABIT_OPTIONS.wrongQuestion),
    },
    {
      key: "backlog",
      label: "Backlog control",
      icon: "layers",
      score: backlogScore,
    },
  ];

  const minScore = Math.min(...items.map((item) => item.score));
  const weakestKey = items.find((item) => item.score === minScore)?.key;

  return items.map((item) => {
    const band = signalBand(item.score, item.key === weakestKey);
    return { ...item, band: band.label, color: band.color };
  });
};

const strengthCopy = (
  key: string,
  score: number,
  extra?: string
): { title: string; body: string; icon: string } | null => {
  switch (key) {
    case "planning":
      return {
        title: score >= 75 ? "Strong planning" : "Clear planning",
        body:
          extra ||
          "You already know what to study when you sit down.",
        icon: "compass",
      };
    case "consistency":
      return {
        title: score >= 75 ? "Strong consistency" : "Steady consistency",
        body: extra || "Your study plan actually happens on most days.",
        icon: "book",
      };
    case "revision":
      return {
        title: score >= 75 ? "Strong revision lock-in" : "Revision underway",
        body: extra || "A real share of studied chapters is strongly completed.",
        icon: "refresh-cw",
      };
    case "accuracy":
      return {
        title: "Error follow-through",
        body: extra || "You go back and fix questions when you get them wrong.",
        icon: "target",
      };
    case "backlog":
      return {
        title: score >= 75 ? "Backlog under control" : "Backlog in check",
        body: extra || "Unfinished chapters are not taking over the syllabus.",
        icon: "layers",
      };
    default:
      return null;
  }
};

const closeQuote = ({
  weakest,
  taggedPct,
  lockedIn,
  backlogCount,
  consistency,
}: {
  weakest?: string;
  taggedPct: number;
  lockedIn: number;
  backlogCount: number;
  consistency: number;
}) => {
  if (weakest === "revision") {
    return `${taggedPct}% of the syllabus is tagged, but only ${lockedIn}% is strongly completed.`;
  }
  if (weakest === "planning") {
    return "When you sit down, you still decide what to study in the moment - the day needs a clearer plan.";
  }
  if (weakest === "backlog") {
    return backlogCount
      ? `You're covering ground, but ${backlogCount} chapter${
          backlogCount === 1 ? "" : "s"
        } are still sitting in backlog.`
      : "Unfinished chapters are still following you from one day to the next.";
  }
  if (weakest === "accuracy") {
    return "Wrong questions aren't turning into a fix-it loop yet - that's the leak after practice.";
  }
  if (weakest === "consistency") {
    return consistency <= 25
      ? "You know what to do, but the plan rarely happens."
      : "You know what to do, but the plan doesn't happen often enough.";
  }
  return `${taggedPct}% of your syllabus is tagged. Leadlly will plan around this, not against it.`;
};

const minutesToClock = (mins: number) => {
  const wrapped = ((Math.round(mins) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const snapHalfHour = (mins: number) => Math.round(mins / 30) * 30;

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

type DayEvent = {
  startMin: number;
  endMin?: number;
  label: string;
  tone: "muted" | "class" | "study" | "revise";
};

const blocksOverlap = (
  left: { start: number; end: number },
  right: { start: number; end: number }
) => left.start < right.end && right.start < left.end;

const buildTypicalDay = (answers: ReturnType<typeof emptyAnswers>) => {
  const wakeClock = answers.wakeTime;
  const sleepClock = answers.sleepTime;
  const wakeMin = wakeClock ? clockMinutes(wakeClock) : 6 * 60 + 30;
  const toRel = (clock: string) => {
    let mins = clockMinutes(clock);
    if (mins < wakeMin) mins += 24 * 60;
    return mins;
  };

  const events: DayEvent[] = [];
  const occupied: Array<{ start: number; end: number }> = [];
  const occupy = (start: number, end: number) => {
    if (end > start) occupied.push({ start, end });
  };
  const add = (
    startMin: number,
    label: string,
    tone: DayEvent["tone"],
    durationMin?: number
  ) => {
    events.push({
      startMin,
      endMin: durationMin ? startMin + durationMin : undefined,
      label,
      tone,
    });
    if (durationMin && durationMin > 0) occupy(startMin, startMin + durationMin);
  };
  const isFree = (start: number, duration = 30) =>
    occupied.every(
      (block) => !blocksOverlap(block, { start, end: start + duration })
    );

  if (wakeClock) add(toRel(wakeClock), "Wake up", "muted");

  const hasClasses =
    Boolean(answers.coachingAttendance) &&
    answers.coachingAttendance !== "no" &&
    Boolean(answers.classStartTime && answers.classEndTime);

  let classEndRel: number | null = null;
  if (hasClasses && answers.classStartTime && answers.classEndTime) {
    const start = toRel(answers.classStartTime);
    const end = toRel(answers.classEndTime);
    add(start, "Coaching starts", "class");
    add(end, "Coaching ends", "class");
    occupy(start, end);
    classEndRel = end;
  }

  for (const slot of answers.studySlots) {
    if (!slot.start) continue;
    const start = toRel(slot.start);
    const rawEnd = slot.end ? toRel(slot.end) : start + 120;
    const duration = Math.max(rawEnd > start ? rawEnd - start : 30, 30);
    const revise = /revis/i.test(slot.label || "");
    add(
      start,
      revise ? "Revision" : "Self study",
      revise ? "revise" : "study",
      duration
    );
  }

  const sleepMin = sleepClock ? toRel(sleepClock) : wakeMin + 17 * 60;
  const dayEnd = sleepMin - 15;

  const lunchMin = snapHalfHour(classEndRel ? classEndRel + 30 : toRel("13:00"));
  if (lunchMin > wakeMin + 45 && lunchMin < dayEnd && isFree(lunchMin, 25)) {
    add(lunchMin, "Lunch / break", "muted", 30);
  }

  let dinnerMin: number | null = null;
  for (const clock of ["21:00", "20:30", "20:00", "19:30"]) {
    const candidate = toRel(clock);
    if (
      candidate < dayEnd - 50 &&
      candidate > wakeMin + 180 &&
      isFree(candidate, 25)
    ) {
      add(candidate, "Dinner", "muted", 30);
      dinnerMin = candidate;
      break;
    }
  }
  if (dinnerMin == null) {
    const fallback = snapHalfHour(dayEnd - 150);
    if (fallback > wakeMin + 180 && isFree(fallback, 25)) {
      add(fallback, "Dinner", "muted", 30);
      dinnerMin = fallback;
    }
  }

  const hasRevision = events.some((event) => event.tone === "revise");
  if (!hasRevision) {
    const revisionStart = snapHalfHour(
      dinnerMin != null ? dinnerMin + 60 : toRel("22:00")
    );
    const revisionDur = Math.min(
      90,
      Math.max(45, dayEnd - revisionStart)
    );
    if (
      revisionStart < dayEnd - 25 &&
      revisionDur >= 40 &&
      isFree(revisionStart, 40)
    ) {
      add(revisionStart, "Revision", "revise", revisionDur);
    }
  }

  const studyMinutesSoFar = events.reduce((sum, event) => {
    if (event.tone !== "study") return sum;
    if (!event.endMin) return sum;
    return sum + Math.max(event.endMin - event.startMin, 0);
  }, 0);
  const studyCount = events.filter((event) => event.tone === "study").length;
  const targetMin = Math.round(
    (SELF_STUDY_BAND_HOURS[answers.selfStudyBand || ""] || 3) * 60
  );
  let remaining = Math.max(targetMin - studyMinutesSoFar, 0);
  if (studyCount < 2) {
    remaining = Math.max(remaining, 75 * (2 - studyCount));
  }

  if (remaining > 0) {
    const from = snapHalfHour(classEndRel ? classEndRel + 90 : wakeMin + 90);
    const until = dinnerMin ?? dayEnd - 120;
    const wantBlocks =
      studyCount >= 2 ? 1 : remaining >= 90 ? 2 : remaining >= 40 ? 1 : 0;
    const chunks: number[] = [];
    if (wantBlocks === 2) {
      const first = Math.min(180, Math.round(remaining * 0.55));
      chunks.push(first, Math.min(180, remaining - first));
    } else if (wantBlocks === 1) {
      chunks.push(Math.min(180, remaining));
    }

    const preferredStarts = [toRel("14:00"), toRel("18:00")];
    const findFreeStart = (preferred: number, want: number) => {
      if (
        preferred >= from &&
        preferred + 40 <= until &&
        isFree(preferred, Math.min(want, 40))
      ) {
        return preferred;
      }
      for (let time = from; time + 40 <= until; time += 30) {
        if (isFree(time, 40)) return time;
      }
      return null;
    };
    const freeDurationFrom = (start: number, want: number) => {
      let end = Math.min(start + want, until);
      for (const block of occupied) {
        if (block.start >= start && block.start < end) end = block.start;
      }
      return Math.max(0, end - start);
    };

    chunks.forEach((duration, index) => {
      if (duration < 40) return;
      const start = findFreeStart(preferredStarts[index], duration);
      if (start == null) return;
      const take = Math.min(duration, freeDurationFrom(start, duration));
      if (take < 40) return;
      add(start, "Self study", "study", take);
    });
  }

  const studyEvents = events
    .filter((event) => event.tone === "study")
    .sort((a, b) => a.startMin - b.startMin);
  for (let index = 0; index < studyEvents.length - 1; index += 1) {
    const currentEnd = studyEvents[index].endMin || studyEvents[index].startMin;
    const nextStart = studyEvents[index + 1].startMin;
    if (nextStart - currentEnd < 40) continue;
    const breakAt = [snapHalfHour(currentEnd), snapHalfHour(currentEnd + 15)].find(
      (time) =>
        time >= currentEnd &&
        time + 20 <= nextStart &&
        isFree(time, 20)
    );
    if (breakAt != null) add(breakAt, "Break", "muted", 20);
  }

  if (sleepClock) add(toRel(sleepClock), "Sleep", "muted");

  const seen = new Set<string>();
  const sorted = events
    .sort((a, b) => a.startMin - b.startMin)
    .filter((event) => {
      const key = `${event.startMin}:${event.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const studyMinutes = sorted.reduce((sum, event) => {
    if (event.tone !== "study" && event.tone !== "revise") return sum;
    if (!event.endMin) return sum;
    return sum + Math.max(event.endMin - event.startMin, 0);
  }, 0);

  return {
    events: sorted.map((event) => ({
      time: formatClock(minutesToClock(event.startMin)),
      label: event.label,
      tone: event.tone,
    })),
    selfStudyHours: Math.round((studyMinutes / 60) * 10) / 10,
  };
};

const loadTopicsForChapters = async (
  chapterRows: ChapterRow[],
  examTags: string[]
) => {
  if (!chapterRows.length) return [];
  const db = await getQuestionsDb();
  if (!db) return [];
  const collection = db.collection("topics");
  const objectIds = chapterRows
    .map((row) => row.id)
    .filter(isObjectId)
    .map((id) => new ObjectId(id));
  const nameQueries = chapterRows
    .filter((row) => row.name)
    .map((row) => ({
      chapterName: new RegExp(`^${escapeRegex(row.name)}$`, "i"),
      ...(row.subject
        ? { subjectName: new RegExp(`^${escapeRegex(row.subject)}$`, "i") }
        : {}),
      ...(row.standard ? { standard: row.standard } : {}),
    }));

  const or: Record<string, unknown>[] = [];
  if (objectIds.length) or.push({ chapterId: { $in: objectIds } });
  or.push(...nameQueries);
  if (!or.length) return [];

  const fetchTopics = async (withExam: boolean) =>
    collection
      .find({
        $or: or,
        ...(withExam && examTags.length ? { exam: { $in: examTags } } : {}),
      })
      .project({ name: 1, chapterName: 1, topicNumber: 1 })
      .sort({ topicNumber: 1, name: 1 })
      .toArray();

  let docs = await fetchTopics(true);
  if (!docs.length && examTags.length) docs = await fetchTopics(false);

  const unique = new Map<string, string>();
  for (const doc of docs) {
    const name = String(doc.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (unique.has(key)) continue;
    unique.set(key, titleCase(name));
  }
  return [...unique.values()];
};

const upcomingTests = (
  tests: Array<{ name: string; date: string; syllabus: string }>,
) => {
  const today = startOfDay(new Date());
  return tests
    .map((test) => {
      const raw = test.date;
      const date = /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? parseISO(raw.slice(0, 10))
        : new Date(raw);
      if (!isValid(date)) return null;
      const days = differenceInCalendarDays(startOfDay(date), today);
      if (days < 0) return null;
      return {
        day: format(date, "d"),
        month: format(date, "MMM").toUpperCase(),
        name: test.name || "Coaching test",
        syllabus: test.syllabus || "",
        days,
        dateLabel: format(date, "d MMM"),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.days - b.days);
};

export async function buildStudentDnaProfile(db: Db, userId: ObjectId) {
  try {
    const [userDoc, doc, rows] = await Promise.all([
      db.collection("users").findOne(
        { _id: userId },
        { projection: { password: 0, salt: 0, resetPasswordToken: 0 } },
      ),
      db.collection("studychecks").findOne({
        $or: [{ user: userId }, { user: userId.toHexString() }],
      }),
      db
        .collection("studydatas")
        .find({
          $or: [{ user: userId }, { user: userId.toHexString() }],
          status: { $in: CHAPTER_STATUSES },
        })
        .project({
          status: 1,
          chapter: 1,
          subject: 1,
          standard: 1,
          updatedAt: 1,
          createdAt: 1,
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .toArray(),
    ]);

    if (!userDoc) return null;

    const user = userDoc as {
      firstname?: string;
      lastname?: string;
      academic?: {
        subjects?: Array<{ name?: string }>;
        standard?: number;
        competitiveExam?: string;
        tests?: Array<{ name: string; date: string; syllabus: string }>;
      };
    };

    const answers = doc
      ? answersFromDoc(doc as Record<string, unknown>)
      : emptyAnswers();
    const taggedChapters = uniqueChapters(
      rows as Parameters<typeof uniqueChapters>[0],
    );
    const subjectOrder = (user.academic?.subjects || [])
      .map((subject) => String(subject.name || "").toLowerCase())
      .filter(Boolean);
    const examTags = examTagsFor(
      user.academic?.competitiveExam,
      answers.exams
    );

    let syllabus: Awaited<ReturnType<typeof loadSyllabusChapters>> = [];
    try {
      syllabus = await loadSyllabusChapters({
        subjects: subjectOrder.length
          ? subjectOrder
          : [
              ...new Set(
                taggedChapters.map((chapter) => chapter.subject.toLowerCase())
              ),
            ],
        standard: user.academic?.standard == null
          ? undefined
          : Number(user.academic.standard),
        examTags,
      });
    } catch (error) {
      console.error("study dna syllabus load failed", error);
    }

    const chapters =
      syllabus.length > 0
        ? mergeSyllabusWithTagged(syllabus, taggedChapters)
        : taggedChapters.map((chapter) => ({ ...chapter, tagged: true }));

    const isTagged = (chapter: ChapterRow) =>
      Boolean(
        chapter.tagged ||
          taggedChapters.some(
            (row) =>
              row.id === chapter.id ||
              chapterNameKey(row.subject, row.name, row.standard) ===
                chapterNameKey(chapter.subject, chapter.name, chapter.standard)
          )
      );

    const subjectNames = [
      ...subjectOrder,
      ...chapters.map((chapter) => chapter.subject.toLowerCase()),
    ].filter((name, index, list) => name && list.indexOf(name) === index);

    const subjects = subjectNames
      .map((subject) => {
        const list = chapters.filter(
          (chapter) => chapter.subject.toLowerCase() === subject
        );
        const total = list.length;
        const taggedForSubject = list.filter(isTagged).length;
        const coveredForSubject = list.filter(
          (chapter) => chapter.status !== CHAPTER_STATUS.NOT_STARTED
        ).length;
        const lockedForSubject = list.filter(
          (chapter) => chapter.status === CHAPTER_STATUS.STRONGLY_COMPLETED
        ).length;
        const coveredPct = percent(coveredForSubject, total);
        const breakdown = BREAKDOWN.map((item) => {
          const count = list.filter(
            (chapter) => chapter.status === item.key
          ).length;
          return {
            key: item.key,
            label: item.label,
            color: item.color,
            count,
            percent: percent(count, total),
          };
        });
        return {
          name: titleCase(subject),
          percent: coveredPct,
          lockedPercent: percent(lockedForSubject, total),
          tagged: taggedForSubject,
          covered: coveredForSubject,
          total,
          color: coveredPct >= 60 ? "#A78BFA" : "#FDBA74",
          breakdown,
        };
      })
      .filter((subject) => subject.total > 0);

    const totalChapters = chapters.length;
    const taggedCount = chapters.filter(isTagged).length;
    const coveredCount = chapters.filter(
      (chapter) => chapter.status !== CHAPTER_STATUS.NOT_STARTED
    ).length;
    const lockedCount = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.STRONGLY_COMPLETED
    ).length;
    const needsRevisionCount = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.COMPLETED_NEEDS_REVISION
    ).length;
    const backlogCount = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.COMPLETED_BACKLOG
    ).length;
    const covered = percent(coveredCount, totalChapters);
    const lockedIn = percent(lockedCount, totalChapters);
    const needsRevisionPct = percent(needsRevisionCount, totalChapters);
    const backlogPct = percent(backlogCount, totalChapters);
    const ongoingCount = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.ONGOING
    ).length;

    const signals = buildSignals(answers, {
      total: totalChapters,
      covered: coveredCount,
      locked: lockedCount,
      backlog: backlogCount,
    });
    const consistency =
      signals.find((item) => item.key === "consistency")?.score ?? 0;
    const revision =
      signals.find((item) => item.key === "revision")?.score ?? 0;
    const accuracy =
      signals.find((item) => item.key === "accuracy")?.score ?? 0;
    const planning =
      signals.find((item) => item.key === "planning")?.score ?? 0;

    const healthPercent = totalChapters
      ? Math.round(
          covered * 0.4 +
            lockedIn * 0.25 +
            consistency * 0.15 +
            revision * 0.1 +
            (100 - backlogPct) * 0.1
        )
      : Math.round((planning + consistency + revision + accuracy) / 4);
    const healthLabel =
      healthPercent >= 75
        ? "STRONG FOUNDATION"
        : healthPercent >= 55
          ? "HEALTHY, IMPROVING"
          : healthPercent >= 40
            ? "NEEDS ATTENTION"
            : "NEEDS A RESET";

    const weakestPrep = [
      { key: "consistency", score: consistency, label: "consistency" },
      { key: "revision", score: revision, label: "revision lock-in" },
      { key: "accuracy", score: accuracy, label: "error follow-through" },
    ].sort((a, b) => a.score - b.score)[0];

    const meaning = totalChapters
      ? `${taggedCount} of ${totalChapters} chapters tagged (${percent(
          taggedCount,
          totalChapters
        )}%). ${lockedCount} strongly completed (${lockedIn}%). Biggest gap: ${weakestPrep.label} at ${weakestPrep.score}%.`
      : `Biggest gap right now is ${weakestPrep.label} at ${weakestPrep.score}%. Tag chapters to map the rest of your syllabus.`;

    const hasClasses =
      answers.coachingAttendance &&
      answers.coachingAttendance !== "no" &&
      Boolean(answers.classStartTime && answers.classEndTime);
    const classHours = hasClasses
      ? hoursBetweenClocks(answers.classStartTime, answers.classEndTime) ||
        answers.coachingHours ||
        0
      : 0;
    const sleepHours = hoursBetweenClocks(answers.sleepTime, answers.wakeTime);
    const typicalDay = buildTypicalDay(answers);
    const slotHours = answers.studySlots.reduce(
      (sum, slot) => sum + hoursBetweenClocks(slot.start, slot.end),
      0
    );
    const selfStudyHours =
      typicalDay.selfStudyHours ||
      slotHours ||
      SELF_STUDY_BAND_HOURS[answers.selfStudyBand || ""] ||
      0;
    const selfStudyHoursLabel = selfStudyHours
      ? formatHrs(selfStudyHours)
      : SELF_STUDY_BAND_LABEL[answers.selfStudyBand || ""] || "-";
    const studyWindowLabel = selfStudyHours
      ? formatHm(selfStudyHours)
      : SELF_STUDY_BAND_LABEL[answers.selfStudyBand || ""] || "-";

    const tests = upcomingTests(
      user.academic?.tests?.length ? user.academic.tests : answers.tests
    );
    const nextTest = tests[0] || null;

    const insight =
      sleepHours >= 7 && sleepHours <= 9
        ? `Sleep is ${formatHrs(sleepHours)} - in a healthy range. We'll protect your self-study window next.`
        : sleepHours > 0 && sleepHours < 7
          ? `Sleep is ${formatHrs(sleepHours)}. Protecting it will give you more usable study hours.`
          : selfStudyHours > 0 && selfStudyHours < 3
            ? `You have ${formatHrs(selfStudyHours)} of self-study on a typical day. We'll protect that window.`
            : answers.selfStudyBand === "lt2"
              ? "Your self-study band is under 2 hours. We'll plan around that, not an ideal day."
              : hasClasses
                ? `Classes run ${formatHrs(classHours)} (${formatClock(
                    answers.classStartTime
                  )} - ${formatClock(answers.classEndTime)}). We'll build around that.`
                : "We'll build your plan around the week you described - not an ideal one.";

    const sortedSignals = [...signals].sort((a, b) => b.score - a.score);
    const strengths = sortedSignals
      .filter((item) => item.score >= 75)
      .slice(0, 3)
      .map((item) => {
        let extra = `Based on your Study Check answer (${item.score}%).`;
        if (item.key === "planning") {
          extra = describeHabit(answers.decideHow)
            ? `You said you sit down with ${describeHabit(answers.decideHow)}.`
            : extra;
        }
        if (item.key === "revision" && coveredCount > 0) {
          extra = `${lockedCount} of ${coveredCount} started chapters are strongly completed (${item.score}%).`;
        }
        if (item.key === "backlog" && totalChapters > 0) {
          extra = `${backlogCount} of ${totalChapters} chapters are in backlog (${backlogPct}%).`;
        }
        if (item.key === "consistency") {
          extra = describeHabit(answers.missedPlan)
            ? `You said your plan happens ${describeHabit(answers.missedPlan)}.`
            : extra;
        }
        if (item.key === "accuracy") {
          extra = describeHabit(answers.wrongQuestion)
            ? `When a question is wrong, ${describeHabit(answers.wrongQuestion)}.`
            : extra;
        }
        return strengthCopy(item.key, item.score, extra);
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (sleepHours >= 7 && sleepHours <= 9 && strengths.length < 3) {
      strengths.push({
        title: "Healthy sleep window",
        body: `You sleep ${formatHrs(sleepHours)} (${formatClock(
          answers.sleepTime
        )} - ${formatClock(answers.wakeTime)}).`,
        icon: "moon",
      });
    }
    if (percent(taggedCount, totalChapters) >= 40 && strengths.length < 3) {
      strengths.push({
        title: "Syllabus underway",
        body: `${taggedCount} of ${totalChapters} chapters are already tagged (${percent(
          taggedCount,
          totalChapters
        )}%).`,
        icon: "book",
      });
    }

    const leaks: Array<{ index: string; title: string; body: string }> = [];
    if (needsRevisionCount > 0) {
      leaks.push({
        index: String(leaks.length + 1).padStart(2, "0"),
        title: "Revision gap",
        body: `${needsRevisionCount} of ${totalChapters} chapters (${needsRevisionPct}%) are tagged "needs revision".`,
      });
    }
    if (backlogCount > 0) {
      leaks.push({
        index: String(leaks.length + 1).padStart(2, "0"),
        title: "Backlog",
        body: `${backlogCount} chapter${
          backlogCount === 1 ? "" : "s"
        } tagged as backlog (${backlogPct}% of the syllabus).`,
      });
    }
    if (consistency > 0 && consistency <= 50) {
      leaks.push({
        index: String(leaks.length + 1).padStart(2, "0"),
        title: "Plan → execution",
        body: `You rated plan follow-through at ${consistency}% - the plan doesn't happen often enough.`,
      });
    }

    const weakestSubject = [...subjects].sort(
      (a, b) => a.percent - b.percent
    )[0];
    const weakChapters = chapters
      .filter(
        (chapter) =>
          weakestSubject &&
          chapter.subject.toLowerCase() === weakestSubject.name.toLowerCase() &&
          (chapter.status === CHAPTER_STATUS.COMPLETED_NEEDS_REVISION ||
            chapter.status === CHAPTER_STATUS.COMPLETED_BACKLOG)
      )
      .map((chapter) => titleCase(chapter.name))
      .slice(0, 2);

    const revisionChapters = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.COMPLETED_NEEDS_REVISION
    );
    const backlogChapters = chapters.filter(
      (chapter) => chapter.status === CHAPTER_STATUS.COMPLETED_BACKLOG
    );
    const [revisionTopics, backlogTopics] = await Promise.all([
      loadTopicsForChapters(revisionChapters, examTags),
      loadTopicsForChapters(backlogChapters, examTags),
    ]);
    const revisionTopicList = revisionTopics.length
      ? revisionTopics
      : revisionChapters.map((chapter) => titleCase(chapter.name));
    const backlogTopicList = backlogTopics.length
      ? backlogTopics
      : backlogChapters.map((chapter) => titleCase(chapter.name));

    const weekFocus: Array<{
      index: string;
      title: string;
      meta: string;
      icon: string;
      topics?: string[];
    }> = [];

    if (revisionChapters.length > 0) {
      weekFocus.push({
        index: "01",
        title: "Clear revision backlog",
        meta: `${revisionTopicList.length} topic${
          revisionTopicList.length === 1 ? "" : "s"
        }`,
        icon: "refresh-cw",
        topics: revisionTopicList,
      });
    }
    if (backlogChapters.length > 0 && weekFocus.length < 4) {
      weekFocus.push({
        index: String(weekFocus.length + 1).padStart(2, "0"),
        title: "Clear backlog chapters",
        meta: `${backlogTopicList.length} topic${
          backlogTopicList.length === 1 ? "" : "s"
        }`,
        icon: "layers",
        topics: backlogTopicList,
      });
    }
    if (
      weakestSubject &&
      weakChapters.length > 0 &&
      weekFocus.length < 3
    ) {
      weekFocus.push({
        index: String(weekFocus.length + 1).padStart(2, "0"),
        title: `Raise ${weakestSubject.name} coverage`,
        meta: `${weakChapters.length} chapter${
          weakChapters.length === 1 ? "" : "s"
        }`,
        icon: "book",
        topics: weakChapters,
      });
    }
    for (const id of answers.biggestProblems.slice(0, 2)) {
      const copy = PROBLEM_FOCUS[id];
      if (!copy) continue;
      if (weekFocus.some((item) => item.title === copy.title)) continue;
      weekFocus.push({
        index: String(weekFocus.length + 1).padStart(2, "0"),
        title: copy.title,
        meta: "You flagged this",
        icon: copy.icon,
      });
      if (weekFocus.length >= 3) break;
    }
    if (nextTest && weekFocus.length < 4) {
      weekFocus.push({
        index: String(weekFocus.length + 1).padStart(2, "0"),
        title: `Prepare for ${nextTest.name}`,
        meta: nextTest.dateLabel,
        icon: "calendar",
      });
    }

    const weekGoal = needsRevisionCount
      ? `Turn ${needsRevisionCount} "needs revision" chapter${
          needsRevisionCount === 1 ? "" : "s"
        } into "strongly completed".`
      : backlogCount
        ? `Clear ${backlogCount} backlog chapter${
            backlogCount === 1 ? "" : "s"
          } this week.`
        : weakestSubject && (weakestSubject.total || 0) > 0
          ? `Raise ${weakestSubject.name} from ${weakestSubject.covered}/${weakestSubject.total} chapters covered (${weakestSubject.percent}%).`
          : "Follow this week's plan and keep coverage moving.";

    const weakestSignal = [...signals].sort((a, b) => a.score - b.score)[0];
    if (!weekFocus.length && weakestSignal) {
      weekFocus.push({
        index: "01",
        title: `Improve ${weakestSignal.label.toLowerCase()}`,
        meta: `${weakestSignal.score}%`,
        icon: weakestSignal.icon,
      });
    }
    const othersWorking = signals.filter(
      (item) => item.key !== weakestSignal?.key && item.score >= 75
    ).length;

    const firstname = titleCase(user.firstname || "Student");
    const lastname = user.lastname ? titleCase(user.lastname) : "";
    const firstToken = (user.firstname || "S").trim();
    const lastToken = (user.lastname || "").trim();
    const initials = `${firstToken.charAt(0)}${
      lastToken.charAt(0) || firstToken.charAt(1) || "T"
    }`.toUpperCase();

    const pictureBody = totalChapters
      ? `${taggedCount} of ${totalChapters} chapters tagged (${percent(
          taggedCount,
          totalChapters
        )}%). ${lockedCount} strongly completed, ${needsRevisionCount} need revision, ${backlogCount} in backlog, ${ongoingCount} ongoing.`
      : "As you tag chapters, this map will show covered versus locked-in using your real syllabus.";

    const closeActions: Array<{ title: string; body: string; icon: string }> =
      [];
    closeActions.push({
      title: "Plan",
      body: "Build your day around classes and real study hours.",
      icon: "compass",
    });
    if (needsRevisionCount > 0) {
      closeActions.push({
        title: "Revise",
        body: `Bring back ${needsRevisionCount} chapter${
          needsRevisionCount === 1 ? "" : "s"
        } you marked needs revision.`,
        icon: "refresh-cw",
      });
    }
    if (backlogCount > 0) {
      closeActions.push({
        title: "Recover",
        body: `Clear ${backlogCount} backlog chapter${
          backlogCount === 1 ? "" : "s"
        } without stalling new ones.`,
        icon: "book",
      });
    }
    if (nextTest) {
      closeActions.push({
        title: "Prepare",
        body: `${nextTest.name} - ${nextTest.dateLabel}.`,
        icon: "calendar",
      });
    }
    closeActions.push({
      title: "Adapt",
      body: "If your accuracy changes, your plan changes too.",
      icon: "repeat",
    });

    const profile = {
      hero: {
        initials,
        name: [firstname, lastname].filter(Boolean).join(" "),
        examLabel: examSummary(answers.exams),
        classLabel: classLabel(
          answers.academicStage,
          user.academic?.standard
        ),
        healthPercent,
        healthLabel,
        consistency,
        revision,
        accuracy,
        meaning,
        subtitle: "A quick snapshot of where you stand right now.",
        chapterProgress: {
          syllabusLabel: `${examSummary(answers.exams)} syllabus`,
          items: [
            {
              key: "tagged",
              percent: percent(taggedCount, totalChapters),
              label: `${taggedCount} of ${totalChapters} chapters tagged`,
              icon: "book-open",
            },
            {
              key: "locked",
              percent: percent(lockedCount, totalChapters),
              label: `${lockedCount} chapter${
                lockedCount === 1 ? "" : "s"
              } strongly completed`,
              icon: "check-circle",
            },
            {
              key: "revision",
              percent: revision,
              label: "Revision lock-in",
              icon: "clock",
            },
          ],
        },
      },
      week: {
        classHoursLabel: formatHrs(classHours),
        classWindow: hasClasses
          ? `${formatClock(answers.classStartTime)} - ${formatClock(
              answers.classEndTime
            )}`
          : "No regular classes",
        selfStudyHoursLabel,
        selfStudyHint: typicalDay.selfStudyHours
          ? "Calculated from your typical day"
          : answers.selfStudyBand
            ? "From the self-study band you selected"
            : "No self-study window added",
        sleepHoursLabel: sleepHours ? formatHrs(sleepHours) : "-",
        sleepWindow:
          answers.sleepTime && answers.wakeTime
            ? `${formatClock(answers.sleepTime)} - ${formatClock(
                answers.wakeTime
              )}`
            : "-",
        nextTest: nextTest
          ? {
              daysLabel:
                nextTest.days === 0
                  ? "Today"
                  : nextTest.days === 1
                    ? "1 day"
                    : `${nextTest.days} days`,
              name: nextTest.name,
              syllabus: nextTest.syllabus,
              day: nextTest.day,
              month: nextTest.month,
            }
          : null,
        studyWindowLabel,
        insight,
      },
      preparation: {
        examName: examFamily(answers.exams),
        subjects,
        pictureTitle: totalChapters
          ? `${taggedCount}/${totalChapters} tagged (${percent(
              taggedCount,
              totalChapters
            )}%). ${lockedCount} strongly completed (${lockedIn}%).`
          : "Your syllabus map starts here.",
        pictureBody,
      },
      signals: {
        items: signals,
        reading:
          othersWorking >= 3
            ? `${weakestSignal?.label || "This signal"} is currently your weakest signal - everything else is already working.`
            : `${weakestSignal?.label || "This signal"} needs the most attention this week.`,
      },
      strengths: strengths.slice(0, 3),
      leaks: leaks.slice(0, 3),
      routine: {
        events: typicalDay.events,
        studyWindowLabel,
      },
      tests: tests.map(({ day, month, name, syllabus }) => ({
        day,
        month,
        name,
        syllabus,
      })),
      weekFocus: weekFocus.slice(0, 4),
      weekGoal,
      close: {
        quote: closeQuote({
          weakest: weakestSignal?.key,
          taggedPct: percent(taggedCount, totalChapters),
          lockedIn,
          backlogCount,
          consistency,
        }),
        actions: closeActions,
      },
    };

    return profile;
  } catch (error) {
    console.error("study dna profile failed", error);
    return null;
  }
}

export type StudyDnaProfile = NonNullable<
  Awaited<ReturnType<typeof buildStudentDnaProfile>>
>;
