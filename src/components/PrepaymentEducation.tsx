"use client";

import { useMemo } from "react";
import {
  BalanceChart,
  EarlyVsLateChart,
  PrepaymentTimingChart,
} from "@/components/charts/LoanCharts";
import type { ScheduleOptions, ScheduleResult } from "@/lib/emi";
import {
  buildPrepaymentTimingAnalysis,
  compareEarlyVsLatePrepayment,
  formatCurrency,
} from "@/lib/emi";

type PrepaymentEducationProps = {
  loanOptions: ScheduleOptions;
  baseline: ScheduleResult;
  modified: ScheduleResult | null;
  samplePrepaymentAmount: number;
};

export default function PrepaymentEducation({
  loanOptions,
  baseline,
  modified,
  samplePrepaymentAmount,
}: PrepaymentEducationProps) {
  const timingPoints = useMemo(
    () =>
      buildPrepaymentTimingAnalysis(
        loanOptions,
        samplePrepaymentAmount,
        10,
      ),
    [loanOptions, samplePrepaymentAmount],
  );

  const earlyVsLate = useMemo(
    () => compareEarlyVsLatePrepayment(loanOptions, samplePrepaymentAmount),
    [loanOptions, samplePrepaymentAmount],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <h3 className="text-base font-semibold text-accent">
          Why prepay early?
        </h3>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-accent/75">
          <p>
            Interest is calculated on your{" "}
            <strong className="text-accent">outstanding balance</strong> each
            month. Prepaying shrinks that balance, so future months charge
            interest on less principal.
          </p>
          <p>
            Paying earlier in the loan saves more than the same amount later,
            because you avoid interest on that principal for more months.
          </p>
          {earlyVsLate.extraInterestIfLate > 0 && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-100">
              Example with {formatCurrency(samplePrepaymentAmount)}: an early
              payment saves about{" "}
              <strong>
                {formatCurrency(earlyVsLate.extraInterestIfLate)} more
              </strong>{" "}
              in interest than a later one in year 1.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BalanceChart baseline={baseline} modified={modified} />
        {earlyVsLate.early && earlyVsLate.late && (
          <EarlyVsLateChart
            earlyLabel={earlyVsLate.early.label}
            lateLabel={earlyVsLate.late.label}
            earlyValue={earlyVsLate.early.interestSaved}
            lateValue={earlyVsLate.late.interestSaved}
          />
        )}
      </div>

      {timingPoints.length > 0 && (
        <PrepaymentTimingChart points={timingPoints} />
      )}
    </div>
  );
}
