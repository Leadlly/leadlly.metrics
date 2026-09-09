import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DualBarChart({
  data,
}: {
  data: Array<{ label: string; session: number; quiz: number }>;
}) {
  return (
    <div className="h-48 w-full min-w-0 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={32} />
          <Tooltip />
          <Bar dataKey="session" name="Topics revised" fill="#9654F4" radius={[6, 6, 0, 0]} />
          <Bar dataKey="quiz" name="Revision accuracy" fill="#56CFE1" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualAreaChart({
  data,
}: {
  data: Array<{ label: string; session: number; quiz: number }>;
}) {
  return (
    <div className="h-48 w-full min-w-0 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="sessionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9654F4" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#9654F4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="quizFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#56CFE1" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#56CFE1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} width={32} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="session"
            name="Topics revised"
            stroke="#9654F4"
            fill="url(#sessionFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="quiz"
            name="Revision accuracy"
            stroke="#56CFE1"
            fill="url(#quizFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProgressRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#eee" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text
          x="48"
          y="53"
          textAnchor="middle"
          className="fill-foreground text-[13px] font-semibold"
        >
          {v}%
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
