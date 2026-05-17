"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PrepaymentTimingPoint, ScheduleResult } from "@/lib/emi";
import { formatCurrency, formatPeriodLabel } from "@/lib/emi";

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#07004d",
    border: "1px solid rgba(228, 253, 225, 0.25)",
    borderRadius: "12px",
    fontSize: "12px",
  },
  labelStyle: { color: "rgba(228, 253, 225, 0.7)" },
  itemStyle: { color: "#e4fde1" },
};

const CHART_COLORS = {
  muted: "rgba(228, 253, 225, 0.45)",
  accent: "#e4fde1",
  grid: "rgba(228, 253, 225, 0.08)",
};

function sampleMonths<T>(
  months: T[],
  maxPoints = 48,
): { item: T; index: number }[] {
  if (months.length <= maxPoints) {
    return months.map((item, index) => ({ item, index }));
  }
  const step = Math.ceil(months.length / maxPoints);
  const out: { item: T; index: number }[] = [];
  for (let i = 0; i < months.length; i += step) {
    out.push({ item: months[i]!, index: i });
  }
  return out;
}

type BalanceChartProps = {
  baseline: ScheduleResult;
  modified?: ScheduleResult | null;
};

export function BalanceChart({ baseline, modified }: BalanceChartProps) {
  const data = useMemo(() => {
    return sampleMonths(baseline.months, 40).map(({ item: m, index }) => ({
      label: formatPeriodLabel(
        m.monthIndex,
        baseline.emiStartYear,
        baseline.emiStartMonth,
      ),
      baseline: Math.round(m.balanceRemaining),
      modified: modified
        ? Math.round(modified.months[index]?.balanceRemaining ?? 0)
        : undefined,
    }));
  }, [baseline, modified]);

  return (
    <div className="rounded-2xl border border-accent/15 bg-accent/5 p-4">
      <h4 className="mb-1 text-sm font-semibold text-accent">Outstanding balance</h4>
      <p className="mb-3 text-xs text-accent/50">
        Hover for values — lower line = faster payoff
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
              tickFormatter={(v) => `${(Number(v) / 100000).toFixed(0)}L`}
            />
            <Tooltip
              {...CHART_TOOLTIP_STYLE}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: "12px", color: CHART_COLORS.muted }} />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Without prepayment"
              stroke={CHART_COLORS.muted}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            {modified && (
              <Line
                type="monotone"
                dataKey="modified"
                name="With prepayment"
                stroke={CHART_COLORS.accent}
                strokeWidth={2.5}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type TimingBarChartProps = {
  points: PrepaymentTimingPoint[];
};

export function PrepaymentTimingChart({ points }: TimingBarChartProps) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        label: p.label,
        saved: Math.round(p.interestSaved),
      })),
    [points],
  );

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-accent/15 bg-accent/5 p-4">
      <h4 className="mb-1 text-sm font-semibold text-accent">
        Interest saved by prepayment timing
      </h4>
      <p className="mb-3 text-xs text-accent/50">
        Hover bars — earlier payments save more interest
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={56}
            />
            <YAxis
              tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
              tickFormatter={(v) => `${(Number(v) / 100000).toFixed(0)}L`}
            />
            <Tooltip
              {...CHART_TOOLTIP_STYLE}
              formatter={(value) => [
                formatCurrency(Number(value)),
                "Interest saved",
              ]}
            />
            <Bar
              dataKey="saved"
              name="Interest saved"
              fill={CHART_COLORS.accent}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type ComparisonBarProps = {
  earlyLabel: string;
  lateLabel: string;
  earlyValue: number;
  lateValue: number;
};

export function EarlyVsLateChart({
  earlyLabel,
  lateLabel,
  earlyValue,
  lateValue,
}: ComparisonBarProps) {
  const data = [
    { name: earlyLabel, saved: Math.round(earlyValue), fill: CHART_COLORS.accent },
    { name: lateLabel, saved: Math.round(lateValue), fill: CHART_COLORS.muted },
  ];

  return (
    <div className="rounded-2xl border border-accent/15 bg-accent/5 p-4">
      <h4 className="mb-3 text-sm font-semibold text-accent">
        Early vs later prepayment (same amount)
      </h4>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
              tickFormatter={(v) => `${(Number(v) / 100000).toFixed(0)}L`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: CHART_COLORS.muted, fontSize: 10 }}
            />
            <Tooltip
              {...CHART_TOOLTIP_STYLE}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Bar dataKey="saved" name="Interest saved" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
