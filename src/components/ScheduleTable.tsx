"use client";

import { Fragment, useState } from "react";
import type { ScheduleResult } from "@/lib/emi";
import {
  formatCurrency,
  formatLoanYearLabel,
  formatPeriodLabel,
} from "@/lib/emi";

type ScheduleTableProps = {
  schedule: ScheduleResult;
  highlightPrepayments?: boolean;
};

export default function ScheduleTable({
  schedule,
  highlightPrepayments = false,
}: ScheduleTableProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([1]),
  );

  const showPenalty = schedule.totalPenalty > 0;

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/15">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-accent/15 bg-accent/10 text-xs uppercase tracking-wide text-accent/60">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3 text-right">EMI paid</th>
              <th className="px-4 py-3 text-right">Interest</th>
              <th className="px-4 py-3 text-right">Prepay</th>
              {showPenalty && (
                <th className="px-4 py-3 text-right">Penalty</th>
              )}
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {schedule.years.map((yearBlock) => {
              const isOpen = expandedYears.has(yearBlock.year);
              const yearLabel = formatLoanYearLabel(
                yearBlock.year,
                schedule.emiStartYear,
              );

              return (
                <Fragment key={yearBlock.year}>
                  <tr
                    className="cursor-pointer border-b border-accent/10 bg-accent/5 hover:bg-accent/10"
                    onClick={() => toggleYear(yearBlock.year)}
                  >
                    <td className="px-4 py-3 font-semibold text-accent" colSpan={2}>
                      <span className="mr-2 inline-block w-4 text-accent/80">
                        {isOpen ? "▼" : "▶"}
                      </span>
                      {yearLabel}
                    </td>
                    <td className="px-4 py-3 text-right text-accent/70">
                      {formatCurrency(yearBlock.totalInterest)}
                    </td>
                    <td className="px-4 py-3 text-right text-accent/90">
                      {yearBlock.totalPrepayment > 0
                        ? formatCurrency(yearBlock.totalPrepayment)
                        : "—"}
                    </td>
                    {showPenalty && (
                      <td className="px-4 py-3 text-right text-red-300/90">
                        {yearBlock.totalPenalty > 0
                          ? formatCurrency(yearBlock.totalPenalty)
                          : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium text-accent">
                      {formatCurrency(yearBlock.totalPayment)}
                    </td>
                    <td className="px-4 py-3 text-right text-accent/50">—</td>
                  </tr>

                  {isOpen &&
                    yearBlock.months.map((row) => {
                      const hasPrepay =
                        row.prepayment > 0 || row.penaltyCharged > 0;
                      const period = formatPeriodLabel(
                        row.monthIndex,
                        schedule.emiStartYear,
                        schedule.emiStartMonth,
                      );

                      return (
                        <tr
                          key={`m-${row.monthIndex}`}
                          className={`border-b border-accent/5 ${
                            highlightPrepayments && hasPrepay
                              ? "bg-accent/10"
                              : "bg-brand/30"
                          }`}
                        >
                          <td className="px-4 py-2.5 pl-10 text-accent/75">
                            {period}
                          </td>
                          <td className="px-4 py-2.5 text-right text-accent">
                            {formatCurrency(row.emiPaid)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-accent/55">
                            {formatCurrency(row.interestCharged)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-accent/80">
                            {row.prepayment > 0
                              ? formatCurrency(row.prepayment)
                              : "—"}
                          </td>
                          {showPenalty && (
                            <td className="px-4 py-2.5 text-right text-red-300/80">
                              {row.penaltyCharged > 0
                                ? formatCurrency(row.penaltyCharged)
                                : "—"}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-right text-accent">
                            {formatCurrency(row.totalPayment)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-accent/70">
                            {formatCurrency(row.balanceRemaining)}
                          </td>
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
