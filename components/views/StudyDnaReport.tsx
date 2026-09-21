"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Aperture,
  Book,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Flag,
  Layers,
  Map,
  Moon,
  PenLine,
  RefreshCw,
  Repeat,
  Target,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { StudyDnaProfile } from "@/lib/study-dna";

const HERO = {
  pink: "#FAADD4",
  yellowSoft: "#FDF3C8",
  purple: "#7C5CFC",
  lavender: "#EFE9FF",
  peach: "#FFD9B8",
  peachText: "#C2410C",
  mint: "#4ADE80",
  amber: "#FBA94C",
  ink: "#141118",
};

const PASTEL = {
  purple: "#A78BFA",
  purpleSoft: "#EDE9FE",
  purpleWash: "#F7F5FB",
  mint: "#86EFAC",
  mintSoft: "#D1FAE5",
  yellow: "#FDE68A",
  yellowSoft: "#FEF3C7",
  orange: "#FDBA74",
  orangeSoft: "#FFEDD5",
  blue: "#93C5FD",
  blueSoft: "#DBEAFE",
  rose: "#FDA4AF",
  roseSoft: "#FFE4E6",
  track: "#EEEAF8",
};

const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  "edit-3": PenLine,
  moon: Moon,
  calendar: Calendar,
  "alert-circle": AlertCircle,
  check: Check,
  "check-circle": CheckCircle2,
  clock: Clock,
  "refresh-cw": RefreshCw,
  target: Target,
  zap: Zap,
  layers: Layers,
  aperture: Aperture,
  map: Map,
  "trending-up": TrendingUp,
  flag: Flag,
  book: Book,
  compass: Compass,
  repeat: Repeat,
};

const PAGE_COUNT = 8;

function IconChip({
  name,
  bg,
  color,
}: {
  name: string;
  bg: string;
  color: string;
}) {
  const Icon = ICONS[name] || Flag;
  return (
    <span
      className="inline-flex size-8 items-center justify-center rounded-xl"
      style={{ backgroundColor: bg, color }}
    >
      <Icon className="size-4" />
    </span>
  );
}

function DnaPie({
  data,
  size,
  label,
  caption,
  innerColor = PASTEL.purpleWash,
}: {
  data: Array<{ value: number; color: string }>;
  size: number;
  label: string;
  caption?: string;
  innerColor?: string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  let acc = 0;
  const stops = (total ? data.filter((slice) => slice.value > 0) : [{ value: 1, color: PASTEL.track }])
    .map((slice) => {
      const start = acc;
      acc += (slice.value / (total || 1)) * 100;
      return `${slice.color} ${start}% ${acc}%`;
    })
    .join(", ");
  const hole = Math.round(size * 0.32);
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${stops})`,
      }}
    >
      <div
        className="absolute inset-0 m-auto flex flex-col items-center justify-center rounded-full"
        style={{
          width: size - hole,
          height: size - hole,
          backgroundColor: innerColor,
        }}
      >
        <p className="text-sm font-bold text-[#141118]">{label}</p>
        {caption ? (
          <p className="text-[8px] font-semibold tracking-wider text-muted-foreground uppercase">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Eyebrow({ children, color = PASTEL.purple }: { children: string; color?: string }) {
  return (
    <p className="text-[11px] font-semibold tracking-[1.4px] uppercase" style={{ color }}>
      {children}
    </p>
  );
}

function PageTitle({ children }: { children: string }) {
  return <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#141118]">{children}</h3>;
}

function Hint({ children }: { children: string }) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>;
}

function splitHours(label: string) {
  if (!label || label === "-" || label === "—") return { value: label || "-", unit: "" };
  if (/[-–—]|to|\+|than|plus/i.test(label)) return { value: label, unit: "" };
  const match = label.match(/^([\d.]+)\s+(.*)$/);
  if (!match) return { value: label, unit: "" };
  return { value: match[1], unit: match[2] };
}

function subjectTitle(name: string) {
  return name.toLowerCase().startsWith("math") ? "Mathematics" : name;
}

const PREP_ROWS = [
  { key: "covered", label: "Covered", color: PASTEL.purple },
  { key: "strongly_completed", label: "Strong", color: PASTEL.mint },
  { key: "completed_needs_revision", label: "Needs revision", color: PASTEL.yellow },
  { key: "completed_backlog", label: "Backlog", color: PASTEL.orange },
  { key: "ongoing", label: "Ongoing", color: PASTEL.blue },
  { key: "not_started", label: "Not covered", color: PASTEL.track },
] as const;

function percentFor(
  subject: StudyDnaProfile["preparation"]["subjects"][number],
  key: string,
  covered: number,
) {
  if (key === "covered") return covered;
  const match = subject.breakdown.find((item) => item.key === key);
  if (typeof match?.percent === "number") return match.percent;
  if (key === "not_started") return Math.max(0, 100 - covered);
  return 0;
}

function HeroPage({ profile }: { profile: StudyDnaProfile }) {
  const { hero } = profile;
  const stats = [
    { value: hero.consistency, label: "Consistency", color: HERO.purple },
    { value: hero.revision, label: "Revision", color: HERO.amber },
    { value: hero.accuracy, label: "Accuracy", color: HERO.mint },
  ];
  const progress = hero.chapterProgress;
  const tones: Record<string, { bg: string; color: string }> = {
    tagged: { bg: "#EFE7FF", color: HERO.purple },
    locked: { bg: "#D9F7E6", color: "#15803D" },
    revision: { bg: "#FFE7D6", color: "#EA580C" },
  };
  return (
    <div
      className="min-h-full rounded-[28px] px-4 py-6"
      style={{ background: `linear-gradient(180deg, ${HERO.pink} 0%, #F7C8E4 55%, ${HERO.yellowSoft} 100%)` }}
    >
      <p className="text-center text-xs font-bold tracking-[2px] text-[#141118] uppercase">
        Your Study DNA
      </p>
      <p className="mt-4 max-w-[72%] text-[22px] leading-7 font-bold text-[#141118] uppercase">
        Built from your routine, syllabus, habits & preparation.
      </p>
      <p className="mt-2 max-w-[70%] text-sm text-[#4B4453]">
        {hero.subtitle || "A quick snapshot of where you stand right now."}
      </p>

      <div className="mt-6 flex items-center rounded-[26px] bg-[#FBF9FF] px-4 py-3 shadow-sm">
        <div
          className="flex size-14 items-center justify-center rounded-full text-lg font-bold"
          style={{ backgroundColor: HERO.lavender, color: HERO.purple }}
        >
          {hero.initials}
        </div>
        <div className="ml-4 min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-[#141118] uppercase">{hero.name}</p>
          <p className="text-sm text-muted-foreground">
            {hero.examLabel} · {hero.classLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[28px] px-4 py-4 shadow-sm" style={{ backgroundColor: HERO.yellowSoft }}>
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold tracking-wide text-[#141118] uppercase">Preparation Health</p>
          <span
            className="rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase"
            style={{ backgroundColor: HERO.peach, color: HERO.peachText }}
          >
            {hero.healthLabel}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-5">
          <DnaPie
            size={120}
            label={`${hero.healthPercent}%`}
            caption="Health"
            innerColor="#FFFDF5"
            data={[
              { value: hero.consistency, color: HERO.purple },
              { value: hero.revision, color: HERO.amber },
              { value: hero.accuracy, color: HERO.mint },
            ]}
          />
          <div className="flex-1">
            {stats.map((stat) => (
              <div key={stat.label} className="mb-3 flex items-center gap-3 last:mb-0">
                <span className="size-3.5 rounded-full" style={{ backgroundColor: stat.color }} />
                <div>
                  <p className="text-lg font-bold" style={{ color: stat.color }}>
                    {stat.value}%
                  </p>
                  <p className="text-xs text-[#141118]">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {progress?.items?.length ? (
        <div className="mt-3 rounded-[28px] bg-[#FBF9FF] px-4 py-4 shadow-sm">
          <p className="text-sm font-bold tracking-wide text-[#141118] uppercase">Chapter progress</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {progress.items.map((item) => {
              const tone = tones[item.key] || tones.tagged;
              return (
                <div key={item.key} className="rounded-[20px] px-3 py-3" style={{ backgroundColor: tone.bg }}>
                  {item.key === "locked" ? (
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#16A34A] text-white">
                      <Check className="size-3.5" />
                    </span>
                  ) : (
                    <IconChip name={item.icon} bg="transparent" color={tone.color} />
                  )}
                  <p className="mt-2 text-xl font-bold text-[#141118]">{item.percent}%</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-[#4B4453]">{item.label}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Math.max(item.percent, 3), 100)}%`,
                        backgroundColor: tone.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WeekPage({ profile }: { profile: StudyDnaProfile }) {
  const { week } = profile;
  const classHours = splitHours(week.classHoursLabel);
  const selfHours = splitHours(week.selfStudyHoursLabel);
  const sleepHours = splitHours(week.sleepHoursLabel);
  return (
    <div className="space-y-4">
      <Eyebrow>Your current snapshot</Eyebrow>
      <PageTitle>Your week at a glance</PageTitle>
      <Hint>This is what your life actually looks like.</Hint>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            bg: PASTEL.purpleSoft,
            icon: "book-open",
            color: PASTEL.purple,
            label: "Classes",
            value: classHours,
            hint: week.classWindow,
          },
          {
            bg: PASTEL.mintSoft,
            icon: "edit-3",
            color: "#34D399",
            label: "Self study",
            value: selfHours,
            hint: week.selfStudyHint,
          },
          {
            bg: PASTEL.blueSoft,
            icon: "moon",
            color: PASTEL.blue,
            label: "Sleep",
            value: sleepHours,
            hint: week.sleepWindow,
          },
          {
            bg: PASTEL.orangeSoft,
            icon: "calendar",
            color: PASTEL.orange,
            label: "Next test",
            value: { value: week.nextTest?.daysLabel ?? "-", unit: "" },
            hint: week.nextTest?.syllabus || week.nextTest?.name || "No test added",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] px-4 py-4" style={{ backgroundColor: card.bg }}>
            <IconChip name={card.icon} bg="#FFFFFF" color={card.color} />
            <p className="mt-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#141118]">
              {card.value.value}
              {card.value.unit ? (
                <span className="text-sm font-medium text-muted-foreground"> {card.value.unit}</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[24px] px-5 py-4" style={{ backgroundColor: PASTEL.purpleSoft }}>
        <Eyebrow>Your real study window</Eyebrow>
        <p className="mt-2 text-3xl font-bold text-[#141118]">{week.studyWindowLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">of usable study time on a typical weekday</p>
        <p className="mt-2 text-sm font-semibold text-[#141118]">
          We'll build your plan around this - not against it.
        </p>
      </div>
      <div className="flex items-start gap-3 rounded-[22px] px-4 py-3" style={{ backgroundColor: PASTEL.yellowSoft }}>
        <AlertCircle className="mt-0.5 size-4 shrink-0" color={PASTEL.orange} />
        <p className="text-sm font-medium text-[#141118]">{week.insight}</p>
      </div>
    </div>
  );
}

function PrepPage({ profile }: { profile: StudyDnaProfile }) {
  const { preparation } = profile;
  return (
    <div className="space-y-4">
      <Eyebrow>Preparation map</Eyebrow>
      <PageTitle>{`Your ${preparation.examName} preparation`}</PageTitle>
      <div className="flex flex-wrap gap-3">
        {PREP_ROWS.map((row) => (
          <span key={row.key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
            {row.label}
          </span>
        ))}
      </div>
      {preparation.subjects.length ? (
        preparation.subjects.map((subject) => {
          const covered = subject.percent || 0;
          const locked =
            typeof subject.lockedPercent === "number"
              ? subject.lockedPercent
              : (subject.breakdown.find((item) => item.key === "strongly_completed")?.percent ?? 0);
          const pieRows = PREP_ROWS.filter((row) => row.key !== "covered");
          return (
            <div
              key={subject.name}
              className="flex items-center gap-4 rounded-[28px] px-4 py-5"
              style={{ backgroundColor: PASTEL.purpleWash }}
            >
              <DnaPie
                size={108}
                label={`${covered}%`}
                caption="Covered"
                data={pieRows.map((row) => ({
                  value: percentFor(subject, row.key, covered),
                  color: row.color,
                }))}
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-[#141118]">{subjectTitle(subject.name)}</p>
                <p className="text-sm" style={{ color: PASTEL.orange }}>
                  Only {locked}% locked in
                </p>
                <div className="mt-3 space-y-1.5">
                  {PREP_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
                        {row.label}
                      </span>
                      <span className="font-semibold text-[#141118]">
                        {percentFor(subject, row.key, covered)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">Tag your chapters to see this map.</p>
      )}
    </div>
  );
}

function SignalsPage({ profile }: { profile: StudyDnaProfile }) {
  return (
    <div className="space-y-4">
      <Eyebrow>Study signals</Eyebrow>
      <PageTitle>Your Study DNA</PageTitle>
      <Hint>Five dimensions, read from your behaviour.</Hint>
      {profile.signals.items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-4 rounded-[24px] px-4 py-3"
          style={{ backgroundColor: PASTEL.purpleWash }}
        >
          <DnaPie
            size={72}
            label={`${item.score}%`}
            data={[
              { value: item.score, color: item.color || PASTEL.purple },
              { value: Math.max(0, 100 - item.score), color: PASTEL.track },
            ]}
          />
          <div>
            <div className="flex items-center gap-2">
              <IconChip name={item.icon} bg="#FFFFFF" color={item.color || PASTEL.purple} />
              <p className="font-semibold text-[#141118]">{item.label}</p>
            </div>
            <p className="mt-1 text-xs font-semibold" style={{ color: item.color }}>
              {item.band}
            </p>
          </div>
        </div>
      ))}
      <div className="rounded-[24px] px-5 py-4" style={{ backgroundColor: PASTEL.purpleSoft }}>
        <Eyebrow>Reading your DNA</Eyebrow>
        <p className="mt-2 text-lg font-bold text-[#141118]">{profile.signals.reading}</p>
      </div>
      <div className="rounded-[24px] px-5 py-4" style={{ backgroundColor: PASTEL.blueSoft }}>
        <Eyebrow color={PASTEL.blue}>Not a score</Eyebrow>
        <p className="mt-2 text-sm text-[#141118]">
          These aren't grades. They're signals Leadlly uses to decide what your next week should look like.
        </p>
      </div>
    </div>
  );
}

function StrengthsPage({ profile }: { profile: StudyDnaProfile }) {
  return (
    <div className="space-y-4">
      <Eyebrow color="#34D399">What's working</Eyebrow>
      <PageTitle>Your three strengths</PageTitle>
      {profile.strengths.length ? (
        profile.strengths.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-[22px] px-4 py-4"
            style={{ backgroundColor: PASTEL.mintSoft }}
          >
            <IconChip name={item.icon} bg="#FFFFFF" color="#34D399" />
            <div>
              <p className="font-bold text-[#141118]">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-[22px] px-4 py-4 text-sm text-muted-foreground" style={{ backgroundColor: PASTEL.purpleSoft }}>
          No strong signals yet - that’s from your current tags and habits, not a placeholder score.
        </p>
      )}
      <Eyebrow color={PASTEL.rose}>The honest part</Eyebrow>
      <PageTitle>Where you're leaking</PageTitle>
      {profile.leaks.length ? (
        profile.leaks.map((item) => (
          <div
            key={item.index}
            className="flex items-start gap-3 rounded-[22px] px-4 py-4"
            style={{ backgroundColor: PASTEL.roseSoft }}
          >
            <p className="font-bold" style={{ color: PASTEL.rose }}>
              {item.index}
            </p>
            <div>
              <p className="font-bold text-[#141118]">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-[22px] px-4 py-4 text-sm text-muted-foreground" style={{ backgroundColor: PASTEL.purpleSoft }}>
          No leak from your current tags or habit answers.
        </p>
      )}
    </div>
  );
}

const TONE_COLOR: Record<string, string> = {
  muted: "#E5E7EB",
  class: PASTEL.purple,
  study: PASTEL.mint,
  revise: PASTEL.orange,
};

function RoutinePage({ profile }: { profile: StudyDnaProfile }) {
  const { routine } = profile;
  return (
    <div className="space-y-4">
      <Eyebrow>Your routine</Eyebrow>
      <PageTitle>Your typical day</PageTitle>
      {routine.events.length ? (
        <div className="mt-2">
          {routine.events.map((event, index) => (
            <div key={`${event.time}-${event.label}-${index}`} className="flex min-h-11">
              <p className="w-20 shrink-0 pt-0.5 text-right text-sm text-muted-foreground">{event.time}</p>
              <div className="relative mx-3 flex w-4 flex-col items-center">
                {index < routine.events.length - 1 ? (
                  <span
                    className="absolute top-2.5 bottom-[-6px] left-[7px] w-px"
                    style={{ backgroundColor: PASTEL.purpleSoft }}
                  />
                ) : null}
                <span
                  className="mt-1.5 size-3 rounded-full"
                  style={{ backgroundColor: TONE_COLOR[event.tone] }}
                />
              </div>
              <p className="flex-1 pt-0.5 font-semibold text-[#141118]">{event.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] px-4 py-4 text-sm text-muted-foreground" style={{ backgroundColor: PASTEL.purpleWash }}>
          No wake, class, study, or sleep times were added, so this timeline stays empty.
        </p>
      )}
      <div className="rounded-[24px] px-5 py-4" style={{ backgroundColor: PASTEL.purpleWash }}>
        <Eyebrow>Study window</Eyebrow>
        <p className="mt-1 text-3xl font-bold text-[#141118]">{routine.studyWindowLabel}</p>
        <p className="text-sm text-muted-foreground">of self study on a typical day</p>
      </div>
      <div className="rounded-[22px] px-5 py-4" style={{ backgroundColor: PASTEL.purpleSoft }}>
        <p className="font-bold text-[#141118]">We'll build your plan around this routine - not against it.</p>
      </div>
    </div>
  );
}

function TestsPage({ profile }: { profile: StudyDnaProfile }) {
  return (
    <div className="space-y-4">
      <Eyebrow>What's coming up</Eyebrow>
      <PageTitle>Your upcoming tests</PageTitle>
      {profile.tests.length ? (
        profile.tests.map((test) => (
          <div
            key={`${test.day}-${test.name}`}
            className="flex items-start rounded-[22px] px-4 py-4"
            style={{ backgroundColor: PASTEL.purpleWash }}
          >
            <div className="mr-4 w-12 text-center">
              <p className="text-2xl font-bold" style={{ color: PASTEL.purple }}>
                {test.day}
              </p>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {test.month}
              </p>
            </div>
            <div>
              <p className="font-bold text-[#141118]">{test.name}</p>
              {test.syllabus ? <p className="mt-0.5 text-sm text-muted-foreground">{test.syllabus}</p> : null}
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-[22px] px-4 py-4 text-sm text-muted-foreground" style={{ backgroundColor: PASTEL.purpleSoft }}>
          No upcoming tests added.
        </p>
      )}
      <Eyebrow>Your next 7 days</Eyebrow>
      <PageTitle>This week, Leadlly focuses on</PageTitle>
      {profile.weekFocus.length ? (
        profile.weekFocus.map((item) => (
          <div key={item.index} className="rounded-[18px] px-4 py-3" style={{ backgroundColor: PASTEL.purpleSoft }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: PASTEL.purple }}>
                {item.index}
              </span>
              <IconChip name={item.icon} bg="transparent" color={PASTEL.purple} />
              <p className="flex-1 text-sm font-semibold text-[#141118]">{item.title}</p>
              {item.meta ? <p className="text-[11px] text-muted-foreground">{item.meta}</p> : null}
            </div>
            {item.topics?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#141118]">
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <p className="rounded-[18px] px-4 py-3 text-sm text-muted-foreground" style={{ backgroundColor: PASTEL.purpleSoft }}>
          Tag chapters or add a test to get a real weekly focus list.
        </p>
      )}
      <div className="rounded-[22px] px-5 py-4" style={{ backgroundColor: PASTEL.mintSoft }}>
        <Eyebrow color="#34D399">Your goal</Eyebrow>
        <p className="mt-2 font-bold text-[#141118]">{profile.weekGoal}</p>
      </div>
    </div>
  );
}

function ClosePage({ profile }: { profile: StudyDnaProfile }) {
  return (
    <div className="space-y-4">
      <Eyebrow>Your study pattern</Eyebrow>
      <p className="mt-3 text-2xl leading-8 font-bold text-[#141118]">“{profile.close.quote}”</p>
      <div className="h-px" style={{ backgroundColor: PASTEL.purpleSoft }} />
      <Eyebrow>So, what will Leadlly do?</Eyebrow>
      {profile.close.actions.map((item) => (
        <div key={item.title} className="flex items-start gap-3 rounded-[22px] bg-white px-4 py-4 shadow-sm">
          <IconChip name={item.icon} bg={PASTEL.purpleSoft} color={PASTEL.purple} />
          <div>
            <p className="font-bold text-[#141118]">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
          </div>
        </div>
      ))}
      <p className="mt-2 text-xl font-bold text-[#141118]">Ready. Let's build your plan.</p>
    </div>
  );
}

export function StudyDnaDialog({
  open,
  loading,
  error,
  profile,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string;
  profile: StudyDnaProfile | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const pages = profile
    ? [
        <HeroPage key="hero" profile={profile} />,
        <WeekPage key="week" profile={profile} />,
        <PrepPage key="prep" profile={profile} />,
        <SignalsPage key="signals" profile={profile} />,
        <StrengthsPage key="strengths" profile={profile} />,
        <RoutinePage key="routine" profile={profile} />,
        <TestsPage key="tests" profile={profile} />,
        <ClosePage key="close" profile={profile} />,
      ]
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close DNA report"
        onClick={onClose}
      />
      <div className="absolute inset-3 flex items-center justify-center sm:inset-5">
        <div
          className="flex h-full min-h-0 w-full max-w-lg max-h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:max-h-[860px] sm:rounded-[28px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
            <button
              type="button"
              onClick={() => (page > 0 ? setPage(page - 1) : onClose())}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
              aria-label="Back"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              {Array.from({ length: PAGE_COUNT }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  className="rounded-full"
                  style={{
                    height: 6,
                    width: index === page ? 18 : 6,
                    backgroundColor: index === page ? HERO.purple : "#DDD6FE",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
              aria-label="Close DNA report"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4">
            {loading ? (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Loading Study DNA…
              </p>
            ) : error ? (
              <p className="py-20 text-center text-sm text-muted-foreground">{error}</p>
            ) : (
              pages[page]
            )}
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-white px-3 py-3 sm:px-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading || !profile}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              disabled={loading || !profile}
              onClick={() => (page === PAGE_COUNT - 1 ? onClose() : setPage(page + 1))}
            >
              {page === PAGE_COUNT - 1 ? "Close" : "Next"}
              {page === PAGE_COUNT - 1 ? null : <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
