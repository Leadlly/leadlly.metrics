"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#5900d9", "#6298d5", "#b183f5", "#f4a261", "#2a9d8f", "#e76f51"];

export function SignupsChart({
  data,
}: {
  data: Array<{ label: string; students: number; staff: number }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="studentsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5900d9" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#5900d9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="staffFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6298d5" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#6298d5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="students"
            name="Students"
            stroke="#5900d9"
            fill="url(#studentsFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="staff"
            name="Teachers / mentors"
            stroke="#6298d5"
            fill="url(#staffFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownPie({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
        {data.map((item, index) => (
          <span key={item.name} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: COLORS[index % COLORS.length] }}
            />
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11 }}
            width={90}
          />
          <Tooltip />
          <Bar dataKey="value" name="Users" fill="#5900d9" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
