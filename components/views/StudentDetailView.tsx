"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Flame, Sparkles, Star, Trophy } from "lucide-react";
import {
  DualAreaChart,
  DualBarChart,
  ProgressRing,
} from "@/components/charts/StudentCharts";
import { Badge, Button } from "@/components/ui/primitives";
import { EmptyState, Panel, StatCard } from "@/components/ui/stat-card";
import { StudentPlannerPanels } from "@/components/views/StudentPlannerPanels";
import { StudyDnaDialog } from "@/components/views/StudyDnaReport";
import { LeadTagBadge } from "@/components/ui/lead-tag-menu";
import { displayDateTime, displayDateValue, displayValue } from "@/lib/display";
import { efficiencyRowClass, isTodayInKolkata } from "@/lib/efficiency";
import { useStudentLeadTags } from "@/hooks/use-student-lead-tags";
import type { StudentDetail, TrackerRow } from "@/lib/mappers";
import type { StudentPlanner } from "@/lib/planner";
import type { ReportDay } from "@/lib/student-reports";
import type { StudyDnaProfile } from "@/lib/study-dna";
import { cn, formatClassLabel, fullName } from "@/lib/utils";

type Reports = {
  weekly: {
    days: ReportDay[];
    startDate: string;
    endDate: string;
    metrics: { topicsRevisedChange: number; revisionAccuracyChange: number };
  };
  monthly: { days: ReportDay[]; startDate: string; endDate: string };
  overall: ReportDay[];
};

type Payload = {
  student: StudentDetail;
  reports: Reports;
  tracker: TrackerRow[];
  quizAttempts: number;
  planner: StudentPlanner | null;
};

function initials(student: StudentDetail) {
  return `${student.firstname.charAt(0)}${student.lastname.charAt(0)}`.toUpperCase() || "S";
}

function MetricChange({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <div className="flex items-center justify-center gap-1">
      {up ? (
        <ArrowUp className="size-3.5 text-emerald-600" />
      ) : (
        <ArrowDown className="size-3.5 text-red-600" />
      )}
      <span className={cn("text-xl font-semibold", up ? "text-emerald-600" : "text-red-600")}>
        {Math.abs(value)}%
      </span>
      <span className="text-xs text-muted-foreground">{up ? "more" : "less"}</span>
    </div>
  );
}

function InfoGrid({
  items,
}: {
  items: Array<{ label: string; value: unknown }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium">
            {displayValue(item.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StudentDetailView({ studentId }: { studentId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [subjectTab, setSubjectTab] = useState("");
  const [rangeTab, setRangeTab] = useState<"weekly" | "monthly" | "overall">("weekly");
  const [dnaOpen, setDnaOpen] = useState(false);
  const [dnaLoading, setDnaLoading] = useState(false);
  const [dnaError, setDnaError] = useState("");
  const [dnaProfile, setDnaProfile] = useState<StudyDnaProfile | null>(null);
  const leadTags = useStudentLeadTags();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${studentId}`);
      if (res.status === 404) throw new Error("not-found");
      if (!res.ok) throw new Error("failed");
      const payload = (await res.json()) as Payload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error && err.message === "not-found" ? "not-found" : "failed");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDnaOpen(false);
    setDnaProfile(null);
    setDnaError("");
    setDnaLoading(false);
  }, [studentId]);

  const openDnaReport = useCallback(async () => {
    if (!data?.student.onboard) return;
    setDnaOpen(true);
    if (dnaProfile) return;
    setDnaLoading(true);
    setDnaError("");
    try {
      const res = await fetch(`/api/students/${studentId}/dna`);
      const payload = (await res.json()) as {
        profile?: StudyDnaProfile;
        error?: string;
      };
      if (!res.ok || !payload.profile) {
        throw new Error(payload.error || "failed");
      }
      setDnaProfile(payload.profile);
    } catch {
      setDnaError("Could not load DNA report.");
    } finally {
      setDnaLoading(false);
    }
  }, [data?.student.onboard, dnaProfile, studentId]);

  const student = data?.student;
  const activeSubjectName = subjectTab || student?.subjects[0]?.name || "";
  const subject = student?.subjects.find((item) => item.name === activeSubjectName) || student?.subjects[0];
  const isToday = student ? isTodayInKolkata(student.dailyReportDate) : false;
  const todayOverall = student && isToday ? student.dailyReportOverall : 0;
  const todaySession = student && isToday ? student.dailyReportSession : 0;
  const todayQuiz = student && isToday ? student.dailyReportQuiz : 0;

  const weeklyChart = useMemo(
    () =>
      (data?.reports.weekly.days || []).map((day) => ({
        label: day.day.slice(0, 3),
        session: day.session,
        quiz: day.quiz,
      })),
    [data],
  );
  const monthlyChart = useMemo(
    () =>
      (data?.reports.monthly.days || []).map((day) => ({
        label: day.date.slice(8),
        session: day.session,
        quiz: day.quiz,
      })),
    [data],
  );
  const overallChart = useMemo(
    () =>
      (data?.reports.overall || []).map((day) => ({
        label: day.date.slice(5),
        session: day.session,
        quiz: day.quiz,
      })),
    [data],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-xl bg-white/70" />
        <div className="h-40 animate-pulse rounded-3xl bg-white/70" />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
          <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          {error === "not-found" ? "Student not found." : "Could not load this student."}
        </p>
        <Link href="/students" className="mt-4 inline-flex">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back to students
          </Button>
        </Link>
      </Panel>
    );
  }

  const name = fullName(student.firstname, student.lastname);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Students
          </Button>
        </Link>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          Student metrics
        </p>
      </div>

      <section
        className={cn(
          "rounded-2xl border border-white/70 p-4 shadow-sm sm:rounded-3xl sm:p-6",
          efficiencyRowClass(todayOverall),
        )}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {student.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.avatar}
                alt=""
                className="size-20 rounded-2xl object-cover sm:size-24"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-white/80 text-xl font-semibold text-primary sm:size-24">
                {initials(student)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatClassLabel(student.standard)}
                {student.exam ? ` · ${student.exam}` : ""}
              </p>
              <p className="mt-1 truncate text-sm">{student.email}</p>
              {student.phone ? (
                <p className="text-sm text-muted-foreground">{student.phone}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={student.category === "free" ? "neutral" : "purple"}>
                  {student.category || "free"}
                </Badge>
                <Badge
                  tone={
                    student.subscription === "active" || student.subscription === "authenticated"
                      ? "green"
                      : student.subscription === "cancelled" || student.subscription === "expired"
                        ? "red"
                        : "neutral"
                  }
                >
                  {student.subscription}
                </Badge>
                {student.institute ? <Badge tone="blue">{student.institute}</Badge> : null}
                <LeadTagBadge
                  tagId={leadTags.tags[student.id]}
                  onRemove={() => leadTags.setTag([student.id], null)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <Trophy className="mx-auto size-4 text-sky-600" />
                <p className="mt-1 text-lg font-semibold">{student.level}</p>
                <p className="text-[11px] text-muted-foreground">Level</p>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <Star className="mx-auto size-4 text-amber-500" />
                <p className="mt-1 text-lg font-semibold">{student.points}</p>
                <p className="text-[11px] text-muted-foreground">Points</p>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <Flame className="mx-auto size-4 text-fuchsia-500" />
                <p className="mt-1 text-lg font-semibold">{student.streak}</p>
                <p className="text-[11px] text-muted-foreground">Streak</p>
              </div>
            </div>
            <Button
              onClick={openDnaReport}
              disabled={!student.onboard}
              variant={student.onboard ? "primary" : "outline"}
              className="w-full"
            >
              <Sparkles className="size-4" />
              {student.onboard ? "View DNA report" : "DNA report not generated"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Today overall"
          value={`${todayOverall}%`}
          hint={
            isToday
              ? displayDateValue(student.dailyReportDate)
              : student.dailyReportDate
                ? `Last report ${displayDateValue(student.dailyReportDate)}`
                : "No daily report yet"
          }
        />
        <StatCard label="Topics revised" value={`${todaySession}%`} hint="Today's session score" />
        <StatCard label="Revision accuracy" value={`${todayQuiz}%`} hint="Today's quiz score" />
        <StatCard label="Quizzes attempted" value={data?.quizAttempts ?? 0} />
      </div>

      <StudentPlannerPanels key={student.id} planner={data?.planner ?? null} />

      <Panel
        title="Today's daily report"
        action={
          <span className="text-xs text-muted-foreground">
            {isToday
              ? displayDateValue(student.dailyReportDate)
              : student.dailyReportDate
                ? `Last ${displayDateValue(student.dailyReportDate)}`
                : "No report yet"}
          </span>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-semibold">{todaySession}%</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2.5 rounded bg-[#9654F4]" />
                Topics revised
              </p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{todayQuiz}%</p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2.5 rounded bg-[#56CFE1]" />
                Revision accuracy
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <DualBarChart
              data={[{ label: "Today", session: todaySession, quiz: todayQuiz }]}
            />
          </div>
        </div>
      </Panel>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Panel
          title="Subject progress"
          action={
            student.subjects.length ? (
              <div className="flex max-w-full flex-wrap gap-1">
                {student.subjects.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSubjectTab(item.name)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      activeSubjectName === item.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : null
          }
        >
          {subject ? (
            <div className="flex items-center justify-around">
              <ProgressRing value={subject.progress} label="Revisions" color="#6200EE" />
              <ProgressRing
                value={subject.efficiency}
                label="Revision accuracy"
                color="#56CFE1"
              />
            </div>
          ) : (
            <EmptyState message="No subject progress yet." />
          )}
        </Panel>

        <Panel
          title="Progress analytics"
          action={
            <div className="flex gap-1 rounded-full border border-border p-1">
              {(["weekly", "monthly", "overall"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRangeTab(tab)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                    rangeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
        >
          {rangeTab === "weekly" ? (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                {displayDateValue(data.reports.weekly.startDate)} –{" "}
                {displayDateValue(data.reports.weekly.endDate)}
              </p>
              <div className="mb-3 grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Topics revised</p>
                  <MetricChange value={data?.reports.weekly.metrics.topicsRevisedChange ?? 0} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revision accuracy</p>
                  <MetricChange
                    value={data?.reports.weekly.metrics.revisionAccuracyChange ?? 0}
                  />
                </div>
              </div>
              <DualBarChart data={weeklyChart} />
            </>
          ) : null}
          {rangeTab === "monthly" ? (
            <>
              <p className="mb-2 text-center text-xs text-muted-foreground">
                {displayDateValue(data.reports.monthly.startDate)} –{" "}
                {displayDateValue(data.reports.monthly.endDate)}
              </p>
              <DualAreaChart data={monthlyChart} />
            </>
          ) : null}
          {rangeTab === "overall" ? (
            overallChart.length ? (
              <DualAreaChart data={overallChart} />
            ) : (
              <EmptyState message="No overall reports yet." />
            )
          ) : null}
        </Panel>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Panel title="Personal details">
          <InfoGrid
            items={[
              { label: "First name", value: student.firstname },
              { label: "Last name", value: student.lastname },
              { label: "Date of birth", value: student.dob },
              { label: "Gender", value: student.gender },
              { label: "Email", value: student.email },
              { label: "Phone", value: student.phone },
              { label: "Parent name", value: student.parentName },
              { label: "Parent phone", value: student.parentPhone },
              { label: "Address", value: student.addressLine },
              { label: "PIN code", value: student.pincode },
              { label: "Country", value: student.country },
            ]}
          />
        </Panel>
        <Panel title="Academic details">
          <InfoGrid
            items={[
              { label: "Class", value: formatClassLabel(student.standard) },
              { label: "Exam", value: student.exam },
              { label: "Schedule", value: student.schedule },
              { label: "School / college", value: student.school },
              { label: "School address", value: student.schoolAddress },
              { label: "Coaching", value: student.coaching },
              { label: "Coaching address", value: student.coachingAddress },
              { label: "Institute", value: student.institute },
              { label: "Plan", value: student.category },
              { label: "Subscription", value: student.subscription },
              { label: "Plan ID", value: student.planId },
              { label: "Free trial", value: student.freeTrial },
              { label: "Created", value: displayDateValue(student.createdAt) },
              { label: "Last activity", value: displayDateTime(student.lastActivity) },
              {
                label: "DNA report",
                value: student.onboard ? "generated" : "not generated",
              },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Chapter tracker">
        {data?.tracker.length ? (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px] text-left text-sm [&_th]:px-4 [&_th]:pb-3 [&_th]:font-medium [&_td]:px-4 [&_td]:py-2.5">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th>Subject</th>
                  <th>Chapter</th>
                  <th>Progress</th>
                  <th>Efficiency</th>
                  <th>Questions</th>
                  <th>Topics</th>
                </tr>
              </thead>
              <tbody>
                {data.tracker.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="font-medium">{row.subject || "—"}</td>
                    <td>{row.chapter || "—"}</td>
                    <td>{Math.round(row.progress)}%</td>
                    <td>{Math.round(row.efficiency)}%</td>
                    <td>{row.questionsSolved}</td>
                    <td>{row.topics}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No tracker chapters yet." />
        )}
      </Panel>

      <StudyDnaDialog
        open={dnaOpen}
        loading={dnaLoading}
        error={dnaError}
        profile={dnaProfile}
        onClose={() => setDnaOpen(false)}
      />
    </div>
  );
}
