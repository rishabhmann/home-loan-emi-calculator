"use client";

import type { ScheduleComparison, ScheduleResult } from "@/lib/emi";
import {
  formatCurrency,
  formatSavings,
  formatTenure,
} from "@/lib/emi";

type ComparisonBannerProps = {
  baseline: ScheduleResult;
  modified: ScheduleResult;
  comparison: ScheduleComparison;
  modifiedLabel: string;
};

export default function ComparisonBanner({
  baseline,
  modified,
  comparison,
  modifiedLabel,
}: ComparisonBannerProps) {
  return (
    <div className="rounded-2xl border border-accent/25 bg-accent/10 p-6">
      <h3 className="text-lg font-semibold text-accent">
        Before vs after ({modifiedLabel})
      </h3>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CompareItem
          label="Original payoff"
          value={formatTenure(baseline.monthsToPayoff)}
        />
        <CompareItem
          label="New payoff"
          value={formatTenure(modified.monthsToPayoff)}
          highlight
        />
        <CompareItem
          label="Time saved"
          value={
            comparison.monthsSaved > 0
              ? formatSavings(comparison)
              : "No reduction"
          }
          highlight={comparison.monthsSaved > 0}
        />
        <CompareItem
          label="Interest saved"
          value={
            comparison.interestSaved > 0
              ? formatCurrency(comparison.interestSaved)
              : "—"
          }
          highlight={comparison.interestSaved > 0}
        />
      </div>

      <p className="mt-4 text-xs text-accent/55">
        Base EMI {formatCurrency(baseline.monthlyEmi)}. Extra payments reduce
        principal and shorten the loan.
      </p>
    </div>
  );
}

function CompareItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-accent/15 bg-brand/40 px-4 py-3">
      <p className="text-xs text-accent/55">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          highlight ? "text-accent" : "text-accent/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
