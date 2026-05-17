"use client";

import type { Contributor } from "@/lib/emi";
import {
  contributorSharePercent,
  formatCurrency,
  sumContributorShares,
} from "@/lib/emi";

type ContributorBreakdownProps = {
  contributors: Contributor[];
  monthlyEmi: number;
};

export default function ContributorBreakdown({
  contributors,
  monthlyEmi,
}: ContributorBreakdownProps) {
  if (contributors.length === 0) return null;

  const totalShares = sumContributorShares(contributors);
  const matchesEmi = monthlyEmi > 0 && Math.abs(totalShares - monthlyEmi) < 1;

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <h4 className="text-sm font-semibold text-accent">EMI contribution split</h4>
      <p className="mt-1 text-xs text-accent/60">
        Each person pays the amount you set — not an equal split.
      </p>

      <ul className="mt-4 space-y-2">
        {contributors.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between rounded-xl border border-accent/15 bg-brand/80 px-3 py-2.5"
          >
            <span className="text-sm font-medium text-accent">{c.name}</span>
            <div className="text-right">
              <span className="text-sm font-semibold text-accent">
                {formatCurrency(c.monthlyShare)}
              </span>
              {monthlyEmi > 0 && (
                <span className="ml-2 text-xs text-accent/55">
                  ({contributorSharePercent(c.monthlyShare, monthlyEmi).toFixed(1)}%)
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-accent/15 pt-3 text-xs">
        <span className="text-accent/60">Total from contributors</span>
        <span className="font-semibold text-accent">
          {formatCurrency(totalShares)}
        </span>
      </div>

      {monthlyEmi > 0 && !matchesEmi && (
        <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          Contributions ({formatCurrency(totalShares)}) do not match monthly EMI (
          {formatCurrency(monthlyEmi)}). Adjust amounts to match your actual split.
        </p>
      )}
    </div>
  );
}
