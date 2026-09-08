"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Building2,
  CreditCard,
  GraduationCap,
  Users,
  UserCheck,
} from "lucide-react";
import { DateRangeFilter } from "@/components/ui/filters";
import { LoadingBlock, Panel, StatCard } from "@/components/ui/stat-card";
import {
  BreakdownPie,
  HorizontalBars,
  SignupsChart,
} from "@/components/charts/Charts";

type Overview = {
  totals: {
    students: number;
    teachers: number;
    mentors: number;
    staff: number;
    institutes: number;
    admins: number;
    batches: number;
    classes: number;
    payments: number;
    meetings: number;
  };
  students: {
    total: number;
    active1d: number;
    active7d: number;
    active30d: number;
    paid: number;
    free: number;
    activeSubs: number;
    freeTrials: number;
    newToday: number;
    new7d: number;
    new30d: number;
  };
  staff: { teachers: number; mentors: number; verified: number };
  charts: {
    signups: Array<{ label: string; students: number; staff: number }>;
    categories: Array<{ name: string; value: number }>;
    exams: Array<{ name: string; value: number }>;
    roles: Array<{ name: string; value: number }>;
  };
};

export function OverviewView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    try {
      const res = await fetch(`/api/overview?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      setData(await res.json());
    } catch {
      setError("Could not load metrics. Check the database connection.");
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Leadlly metrics
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Platform overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students, teachers, mentors, and institutes in one place.
          </p>
        </div>
        <DateRangeFilter
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          onApply={() => setApplied({ from, to })}
          onReset={() => {
            setFrom("");
            setTo("");
            setApplied({ from: "", to: "" });
          }}
        />
      </div>

      {error ? (
        <Panel>
          <p className="text-sm text-destructive">{error}</p>
        </Panel>
      ) : null}

      {loading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Students"
              value={data.totals.students}
              hint={`${data.students.new7d} new this week`}
              icon={<GraduationCap className="size-5" />}
            />
            <StatCard
              label="Active students (7d)"
              value={data.students.active7d}
              hint={`${data.students.active1d} in last 24h`}
              icon={<Activity className="size-5" />}
            />
            <StatCard
              label="Teachers & mentors"
              value={data.totals.staff}
              hint={`${data.staff.teachers} teachers · ${data.staff.mentors} mentors`}
              icon={<Users className="size-5" />}
            />
            <StatCard
              label="Institutes"
              value={data.totals.institutes}
              hint={`${data.totals.admins} institute admins`}
              icon={<Building2 className="size-5" />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Paid / subscribed"
              value={data.students.paid}
              hint={`${data.students.activeSubs} active subscriptions`}
              icon={<CreditCard className="size-5" />}
            />
            <StatCard
              label="Free students"
              value={data.students.free}
              hint={`${data.students.freeTrials} active free trials`}
            />
            <StatCard
              label="Verified staff"
              value={data.staff.verified}
              hint="Teachers and mentors marked verified"
              icon={<UserCheck className="size-5" />}
            />
            <StatCard
              label="Batches / classes"
              value={`${data.totals.batches} / ${data.totals.classes}`}
              hint={`${data.totals.meetings} mentor meetings`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Signups · last 24 months" className="xl:col-span-2">
              <SignupsChart data={data.charts.signups} />
            </Panel>
            <Panel title="Platform mix">
              <BreakdownPie data={data.charts.roles} />
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Students by plan">
              <BreakdownPie data={data.charts.categories} />
            </Panel>
            <Panel title="Students by exam">
              <HorizontalBars data={data.charts.exams} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
