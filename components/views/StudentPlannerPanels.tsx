"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { EmptyState, Panel } from "@/components/ui/stat-card";
import { displayDateValue } from "@/lib/display";
import type { PlannerDay, PlannerTopic, StudentPlanner } from "@/lib/planner";
import { cn } from "@/lib/utils";

function prettyName(value: string) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusTone(status: PlannerTopic["status"]) {
  if (status === "completed") return "green" as const;
  if (status === "incomplete") return "amber" as const;
  return "neutral" as const;
}

function statusLabel(status: PlannerTopic["status"]) {
  if (status === "completed") return "done";
  if (status === "incomplete") return "in progress";
  return "pending";
}

function accuracyTone(accuracy: number) {
  if (accuracy >= 70) return "green" as const;
  if (accuracy >= 50) return "amber" as const;
  if (accuracy > 0) return "red" as const;
  return "neutral" as const;
}

function TopicRow({ topic }: { topic: PlannerTopic }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl bg-[#F8F4FE] px-3 py-3 sm:px-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{prettyName(topic.name)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[
            topic.chapter,
            topic.subject,
            topic.kind === "subtopic" ? "Subtopic" : "",
          ]
            .filter(Boolean)
            .map((item) => prettyName(item))
            .join(" · ")}
          {topic.questions ? ` · ${topic.questions} questions` : ""}
        </p>
        {topic.reason ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
            {topic.reason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={accuracyTone(topic.accuracy)}>
          {topic.accuracy > 0 ? `${topic.accuracy}% quiz` : `${topic.mastery || 0}% mastery`}
        </Badge>
        <Badge tone={statusTone(topic.status)}>{statusLabel(topic.status)}</Badge>
      </div>
    </li>
  );
}

function TopicSection({
  title,
  hint,
  topics,
  empty,
}: {
  title: string;
  hint?: string;
  topics: PlannerTopic[];
  empty: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="text-xs text-muted-foreground">{topics.length}</span>
      </div>
      {topics.length ? (
        <ul className="space-y-2">
          {topics.map((topic, index) => (
            <TopicRow key={`${topic.itemId || topic.id}-${index}`} topic={topic} />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      )}
    </section>
  );
}

function QuizSection({
  weeklyQuiz,
  chapters,
}: {
  weeklyQuiz: StudentPlanner["weeklyQuiz"];
  chapters: PlannerDay["chapters"];
}) {
  if (!weeklyQuiz && !chapters.length) return null;
  return (
    <section>
      <div className="mb-2">
        <h3 className="text-sm font-semibold">Quizzes</h3>
        <p className="text-xs text-muted-foreground">
          Weekly and chapter quizzes from the new planner
        </p>
      </div>
      <ul className="space-y-2">
        {weeklyQuiz ? (
          <li className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F4FE] px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Weekly quiz</p>
              {weeklyQuiz.endDate ? (
                <p className="text-xs text-muted-foreground">
                  Due {displayDateValue(weeklyQuiz.endDate)}
                </p>
              ) : null}
            </div>
            <Badge tone={weeklyQuiz.attempted ? "green" : "amber"}>
              {weeklyQuiz.attempted ? "attempted" : "open"}
            </Badge>
          </li>
        ) : null}
        {chapters.map((chapter) => (
          <li
            key={chapter.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F4FE] px-3 py-3 sm:px-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{prettyName(chapter.name)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[chapter.subject ? prettyName(chapter.subject) : "", "Chapter quiz"]
                  .filter(Boolean)
                  .join(" · ")}
                {chapter.endDate ? ` · due ${displayDateValue(chapter.endDate)}` : ""}
              </p>
            </div>
            <Badge tone={chapter.attempted ? "green" : "amber"}>
              {chapter.attempted ? "attempted" : "open"}
            </Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}

function dayTopicNames(day: PlannerDay) {
  return [
    ...day.dailyRevision,
    ...day.accuracyRevision,
    ...day.pendingRevision,
  ].map((topic) => prettyName(topic.name));
}

export function StudentPlannerPanels({ planner }: { planner: StudentPlanner | null }) {
  const days = planner?.days || [];
  const [selectedDate, setSelectedDate] = useState("");
  const selected = useMemo(
    () => days.find((day) => day.date === selectedDate) || null,
    [days, selectedDate],
  );
  const today = planner?.today;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <Panel
        title="Today's planner"
        action={
          <span className="text-xs text-muted-foreground">
            {today
              ? `${today.completed}/${today.total} done · ${displayDateValue(today.date)}`
              : planner
                ? "No topics scheduled today"
                : "No planner yet"}
          </span>
        }
      >
        {today ? (
          <div className="space-y-5">
            {!planner?.coversToday ? (
              <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                No planner items were generated for today yet.
              </p>
            ) : null}
            <TopicSection
              title="Current learning"
              hint="What the student logged / learned today"
              topics={today.dailyRevision}
              empty="No current learning topics for today."
            />
            <TopicSection
              title="Accuracy revision"
              hint="Weak topics scheduled by the planner"
              topics={today.accuracyRevision}
              empty="No accuracy revision topics for today."
            />
            <TopicSection
              title="Past revision"
              hint="Memory / spaced revision due today"
              topics={today.pendingRevision}
              empty="No past revision topics for today."
            />
            <QuizSection weeklyQuiz={planner?.weeklyQuiz ?? null} chapters={today.chapters} />
          </div>
        ) : (
          <EmptyState message="No daily planner for this student yet." />
        )}
      </Panel>

      <Panel
        title="Planner days"
        action={
          planner ? (
            <span className="text-xs text-muted-foreground">
              {displayDateValue(planner.startDate)} – {displayDateValue(planner.endDate)}
              {planner.algorithmVersion ? ` · ${planner.algorithmVersion}` : ""}
            </span>
          ) : null
        }
      >
        {days.length ? (
          <div className="space-y-3">
            <ul className="space-y-2">
              {days.map((day) => {
                const names = dayTopicNames(day);
                const active = selected?.date === day.date;
                return (
                  <li key={day.id || day.date}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDate((current) =>
                          current === day.date ? "" : day.date,
                        )
                      }
                      className={cn(
                        "w-full rounded-2xl border px-3 py-3 text-left transition sm:px-4",
                        day.isToday
                          ? "border-primary bg-primary text-primary-foreground"
                          : active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-white hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          {day.isToday ? "Today" : day.day || "Day"}
                          <span
                            className={cn(
                              "ml-2 text-xs font-medium",
                              day.isToday
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground",
                            )}
                          >
                            {displayDateValue(day.date)}
                          </span>
                        </p>
                        <span className="text-xs font-medium">
                          {day.completed}/{day.total}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 truncate text-xs",
                          day.isToday
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {names.length ? names.join(" / ") : "No topics"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selected ? (
              <div className="rounded-2xl border border-border/70 p-3 sm:p-4">
                <p className="mb-3 text-sm font-semibold">
                  {selected.isToday ? "Today" : selected.day}: planner items
                </p>
                <div className="space-y-4">
                  <TopicSection
                    title="Current learning"
                    topics={selected.dailyRevision}
                    empty="None scheduled."
                  />
                  <TopicSection
                    title="Accuracy revision"
                    topics={selected.accuracyRevision}
                    empty="None scheduled."
                  />
                  <TopicSection
                    title="Past revision"
                    topics={selected.pendingRevision}
                    empty="None scheduled."
                  />
                  {selected.isToday ? (
                    <QuizSection
                      weeklyQuiz={planner?.weeklyQuiz ?? null}
                      chapters={selected.chapters}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState message="No planner items in the recent window yet." />
        )}
      </Panel>
    </div>
  );
}
