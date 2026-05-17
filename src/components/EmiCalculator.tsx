"use client";

import { useEffect, useMemo, useState } from "react";
import { BalanceChart } from "@/components/charts/LoanCharts";
import ComparisonBanner from "@/components/ComparisonBanner";
import ContributorBreakdown from "@/components/ContributorBreakdown";
import PrepaymentEducation from "@/components/PrepaymentEducation";
import ScheduleTable from "@/components/ScheduleTable";
import {
  MAX_TENURE_YEARS,
  MONTH_LABELS,
  type Contributor,
  type RateMode,
  type ScheduleOptions,
  buildAmortizationSchedule,
  buildYearlyRepeatExtraPayments,
  calendarToMonthIndex,
  calendarYearForLoanYear,
  compareSchedules,
  formatCurrency,
  formatLoanYearLabel,
  formatTenure,
  getDefaultEmiStart,
} from "@/lib/emi";

type TabId = "standard" | "prepayments" | "emiIncrease";

type FormState = {
  loanAmount: string;
  annualRate: string;
  tenureYears: string;
};

type ContributorRow = {
  id: string;
  name: string;
  amount: string;
};

type PrepaymentEntry = {
  id: string;
  calendarYear: string;
  calendarMonth: string;
  amount: string;
};

const initialForm: FormState = {
  loanAmount: "5000000",
  annualRate: "8.5",
  tenureYears: "20",
};

const TABS: { id: TabId; label: string; description: string }[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Full amortization from your EMI start month",
  },
  {
    id: "prepayments",
    label: "Prepayments",
    description:
      "One-time or repeating yearly lump sums — same math, one place",
  },
  {
    id: "emiIncrease",
    label: "Increase EMI",
    description: "Raise EMI each year and see interest & tenure savings",
  },
];

const inputClass =
  "w-full rounded-xl border border-accent/20 bg-brand/50 px-4 py-3 text-accent outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";
const selectClass =
  "w-full rounded-xl border border-accent/20 bg-brand/50 px-3 py-3 text-accent outline-none focus:border-accent";

function ResultCard({
  label,
  value,
  subValue,
  highlight,
}: {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-accent/35 bg-accent/10"
          : "border-accent/15 bg-accent/5"
      }`}
    >
      <p className="text-xs font-medium text-accent/60">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tracking-tight ${
          highlight ? "text-accent" : "text-accent"
        }`}
      >
        {value}
      </p>
      {subValue && (
        <p className="mt-0.5 text-xs text-accent/50">{subValue}</p>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-accent/90">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      <p className="text-xs text-accent/45">{hint}</p>
    </div>
  );
}

function parseContributors(rows: ContributorRow[]): Contributor[] {
  return rows.map((r, i) => ({
    name: r.name.trim() || `Person ${i + 1}`,
    monthlyShare: Math.max(0, parseFloat(r.amount) || 0),
  }));
}

function parseLoan(
  form: FormState,
  rateMode: RateMode,
  variableRates: string[],
  emiStartYear: number,
  emiStartMonth: number,
  contributors: Contributor[],
  prepaymentPenaltyPercent: number,
): ScheduleOptions {
  const tenureYears = parseFloat(form.tenureYears);
  const tenureInt = Math.min(
    MAX_TENURE_YEARS,
    Math.max(1, Math.floor(tenureYears) || 1),
  );

  const variableRatesByYear =
    rateMode === "variable"
      ? Array.from({ length: tenureInt }, (_, i) => {
          const v = parseFloat(variableRates[i] ?? form.annualRate);
          return Number.isFinite(v) ? v : parseFloat(form.annualRate);
        })
      : undefined;

  return {
    loanAmount: parseFloat(form.loanAmount),
    annualRate: parseFloat(form.annualRate),
    tenureYears,
    rateMode,
    variableRatesByYear,
    emiStartYear,
    emiStartMonth,
    contributors,
    prepaymentPenaltyPercent:
      rateMode === "fixed" ? prepaymentPenaltyPercent : 0,
  };
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newPrepaymentEntry(
  calendarYear: number,
  calendarMonth = 1,
): PrepaymentEntry {
  return {
    id: newId(),
    calendarYear: String(calendarYear),
    calendarMonth: String(calendarMonth),
    amount: "100000",
  };
}

function newContributorRow(index: number): ContributorRow {
  return {
    id: newId(),
    name: `Person ${index}`,
    amount: "",
  };
}

export default function EmiCalculator() {
  const defaultStart = getDefaultEmiStart();
  const [activeTab, setActiveTab] = useState<TabId>("standard");
  const [form, setForm] = useState<FormState>(initialForm);
  const [rateMode, setRateMode] = useState<RateMode>("fixed");
  const [variableRates, setVariableRates] = useState<string[]>([]);
  const [emiStartYear, setEmiStartYear] = useState(String(defaultStart.year));
  const [emiStartMonth, setEmiStartMonth] = useState(String(defaultStart.month));
  const [contributorRows, setContributorRows] = useState<ContributorRow[]>(() => [
    newContributorRow(1),
  ]);
  const [prepaymentPenaltyPercent, setPrepaymentPenaltyPercent] = useState("2");
  const [emiIncreasePercent, setEmiIncreasePercent] = useState("5");
  const [prepaymentEntries, setPrepaymentEntries] = useState<PrepaymentEntry[]>(
    () => [newPrepaymentEntry(defaultStart.year, defaultStart.month)],
  );
  const [repeatYearlyAmount, setRepeatYearlyAmount] = useState("");
  const [repeatYearlyMonth, setRepeatYearlyMonth] = useState(
    String(defaultStart.month),
  );

  const startYearNum = parseInt(emiStartYear, 10) || defaultStart.year;
  const startMonthNum = Math.min(
    12,
    Math.max(1, parseInt(emiStartMonth, 10) || defaultStart.month),
  );
  const penaltyNum = Math.max(0, parseFloat(prepaymentPenaltyPercent) || 0);
  const tenureYearsInt = Math.min(
    MAX_TENURE_YEARS,
    Math.max(1, Math.floor(parseFloat(form.tenureYears)) || 1),
  );

  const contributors = useMemo(
    () => parseContributors(contributorRows),
    [contributorRows],
  );

  const baseLoanOptions = useMemo(
    () =>
      parseLoan(
        form,
        rateMode,
        variableRates,
        startYearNum,
        startMonthNum,
        contributors,
        penaltyNum,
      ),
    [
      form,
      rateMode,
      variableRates,
      startYearNum,
      startMonthNum,
      contributors,
      penaltyNum,
    ],
  );

  const baselineSchedule = useMemo(
    () => buildAmortizationSchedule(baseLoanOptions),
    [baseLoanOptions],
  );

  const parsedPrepayments = useMemo(() => {
    if (!baselineSchedule) return [];

    const fromEntries = prepaymentEntries
      .map((row) => {
        const amount = parseFloat(row.amount);
        const calYear = parseInt(row.calendarYear, 10) || startYearNum;
        const calMonth = parseInt(row.calendarMonth, 10) || 1;
        const atMonth = calendarToMonthIndex(
          calYear,
          calMonth,
          startYearNum,
          startMonthNum,
        );
        if (!Number.isFinite(amount) || amount <= 0) return null;
        if (atMonth < 1 || atMonth > baselineSchedule.monthsToPayoff) {
          return null;
        }
        return { atMonth, amount };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    const repeatAmount = parseFloat(repeatYearlyAmount);
    const repeatMonth = parseInt(repeatYearlyMonth, 10) || startMonthNum;
    const fromRepeat =
      Number.isFinite(repeatAmount) && repeatAmount > 0
        ? buildYearlyRepeatExtraPayments(
            repeatAmount,
            repeatMonth,
            startYearNum,
            startMonthNum,
            tenureYearsInt,
          )
        : [];

    return [...fromEntries, ...fromRepeat];
  }, [
    prepaymentEntries,
    repeatYearlyAmount,
    repeatYearlyMonth,
    baselineSchedule,
    startYearNum,
    startMonthNum,
    tenureYearsInt,
  ]);

  const prepaymentSchedule = useMemo(() => {
    if (!baselineSchedule || parsedPrepayments.length === 0) return null;
    return buildAmortizationSchedule({
      ...baseLoanOptions,
      extraPayments: parsedPrepayments,
    });
  }, [baseLoanOptions, parsedPrepayments, baselineSchedule]);

  const emiIncreasePercentNum = parseFloat(emiIncreasePercent) || 0;
  const yearlyEmiIncreasePercent = useMemo(() => {
    if (emiIncreasePercentNum <= 0) return undefined;
    return Array.from({ length: tenureYearsInt - 1 }, () => emiIncreasePercentNum);
  }, [emiIncreasePercentNum, tenureYearsInt]);

  const emiIncreaseSchedule = useMemo(() => {
    if (!baselineSchedule || !yearlyEmiIncreasePercent) return null;
    return buildAmortizationSchedule({
      ...baseLoanOptions,
      yearlyEmiIncreasePercent,
    });
  }, [baseLoanOptions, yearlyEmiIncreasePercent, baselineSchedule]);

  const activeSchedule = useMemo(() => {
    if (activeTab === "prepayments") {
      return prepaymentSchedule ?? baselineSchedule;
    }
    if (activeTab === "emiIncrease") {
      return emiIncreaseSchedule ?? baselineSchedule;
    }
    return baselineSchedule;
  }, [activeTab, baselineSchedule, prepaymentSchedule, emiIncreaseSchedule]);

  const prepaymentComparison = useMemo(() => {
    if (!baselineSchedule || !prepaymentSchedule) return null;
    return compareSchedules(baselineSchedule, prepaymentSchedule);
  }, [baselineSchedule, prepaymentSchedule]);

  const emiIncreaseComparison = useMemo(() => {
    if (!baselineSchedule || !emiIncreaseSchedule) return null;
    return compareSchedules(baselineSchedule, emiIncreaseSchedule);
  }, [baselineSchedule, emiIncreaseSchedule]);

  const samplePrepaymentAmount = useMemo(() => {
    const first = parsedPrepayments[0];
    if (first) return first.amount;
    const parsed = parseFloat(repeatYearlyAmount);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 100000;
  }, [parsedPrepayments, repeatYearlyAmount]);

  const calendarYearOptions = useMemo(() => {
    return Array.from({ length: tenureYearsInt }, (_, i) =>
      calendarYearForLoanYear(i + 1, startYearNum),
    );
  }, [tenureYearsInt, startYearNum]);

  const update = (key: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setVariableRates((prev) => {
      const next = [...prev];
      const base = form.annualRate;
      while (next.length < tenureYearsInt) next.push(base);
      return next.slice(0, tenureYearsInt);
    });
  }, [tenureYearsInt, form.annualRate]);

  const setContributorCount = (count: number) => {
    const n = Math.min(20, Math.max(1, count));
    setContributorRows((prev) => {
      const next = [...prev];
      while (next.length < n) {
        next.push(newContributorRow(next.length + 1));
      }
      return next.slice(0, n);
    });
  };

  const updateContributor = (id: string, patch: Partial<ContributorRow>) => {
    setContributorRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const setVariableRate = (index: number, value: string) => {
    setVariableRates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addPrepaymentEntry = () => {
    const lastYear =
      calendarYearOptions[calendarYearOptions.length - 1] ?? startYearNum;
    setPrepaymentEntries((prev) => [
      ...prev,
      newPrepaymentEntry(lastYear, startMonthNum),
    ]);
  };

  const removePrepaymentEntry = (id: string) => {
    setPrepaymentEntries((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
  };

  const updatePrepaymentEntry = (
    id: string,
    patch: Partial<PrepaymentEntry>,
  ) => {
    setPrepaymentEntries((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const displayEmi = activeSchedule?.monthlyEmi ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent/80">
          Home Loan
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-accent sm:text-5xl">
          EMI Calculator
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-accent/60">
          Custom EMI splits, unified prepayments, and calendar-based schedules.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-accent/15 bg-accent/5 p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
              activeTab === tab.id
                ? "bg-accent text-brand shadow"
                : "text-accent/70 hover:bg-accent/10 hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="mb-8 text-center text-sm text-accent/50">
        {TABS.find((t) => t.id === activeTab)?.description}
      </p>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-3xl border border-accent/15 bg-accent/5 p-6 lg:col-span-1">
          <h2 className="mb-5 text-lg font-semibold text-accent">Loan details</h2>
          <div className="space-y-5">
            <Field
              id="loanAmount"
              label="Loan amount"
              hint="Principal borrowed"
              value={form.loanAmount}
              onChange={update("loanAmount")}
              min={1}
              step={10000}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-accent/90">
                  EMI starts (month)
                </label>
                <select
                  value={emiStartMonth}
                  onChange={(e) => setEmiStartMonth(e.target.value)}
                  className={selectClass}
                >
                  {MONTH_LABELS.map((name, i) => (
                    <option key={name} value={String(i + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-accent/45">1st of this month</p>
              </div>
              <Field
                id="emiStartYear"
                label="Start year"
                hint="First EMI calendar year"
                value={emiStartYear}
                onChange={setEmiStartYear}
                min={2000}
                max={2100}
                step={1}
              />
            </div>

            <div className="space-y-3 border-t border-accent/10 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-accent/90">
                  EMI contributors
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setContributorCount(contributorRows.length - 1)
                    }
                    disabled={contributorRows.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-accent/20 text-accent disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="text-sm text-accent">{contributorRows.length}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setContributorCount(contributorRows.length + 1)
                    }
                    disabled={contributorRows.length >= 20}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-brand"
                  >
                    +
                  </button>
                </div>
              </div>
              <p className="text-xs text-accent/45">
                Enter each person&apos;s monthly share in ₹ (e.g. 30,000 + 20,000,
                not 50% each).
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {contributorRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1fr_1fr] gap-2 rounded-xl border border-accent/15 bg-brand/40 p-2"
                  >
                    <input
                      type="text"
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) =>
                        updateContributor(row.id, { name: e.target.value })
                      }
                      className="rounded-lg border border-accent/15 bg-brand/60 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder={displayEmi > 0 ? "₹ / month" : "Amount"}
                      value={row.amount}
                      onChange={(e) =>
                        updateContributor(row.id, { amount: e.target.value })
                      }
                      className="rounded-lg border border-accent/15 bg-brand/60 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-accent/90">Interest rate type</p>
              <div className="grid grid-cols-2 gap-2">
                {(["fixed", "variable"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRateMode(mode)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      rateMode === mode
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-accent/20 text-accent/55 hover:border-accent/35"
                    }`}
                  >
                    {mode === "fixed" ? "Fixed" : "Floating"}
                  </button>
                ))}
              </div>
            </div>

            {rateMode === "fixed" ? (
              <>
                <Field
                  id="annualRate"
                  label="Rate of interest (p.a.)"
                  hint="Fixed annual rate in %"
                  value={form.annualRate}
                  onChange={update("annualRate")}
                  min={0}
                  max={30}
                  step={0.1}
                />
                <Field
                  id="prepayPenalty"
                  label="Prepayment penalty (%)"
                  hint="On fixed-rate prepayment principal only"
                  value={prepaymentPenaltyPercent}
                  onChange={setPrepaymentPenaltyPercent}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-accent/90">
                  Floating rate per calendar year (%)
                </p>
                <p className="text-xs text-accent/50">
                  No prepayment penalty on floating-rate loans.
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {Array.from({ length: tenureYearsInt }, (_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label
                        htmlFor={`var-rate-${i}`}
                        className="w-12 shrink-0 text-xs text-accent/55"
                      >
                        {formatLoanYearLabel(i + 1, startYearNum)}
                      </label>
                      <input
                        id={`var-rate-${i}`}
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={variableRates[i] ?? form.annualRate}
                        onChange={(e) => setVariableRate(i, e.target.value)}
                        className="flex-1 rounded-lg border border-accent/20 bg-brand/50 px-3 py-2 text-sm text-accent outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field
              id="tenureYears"
              label="Loan tenure (years)"
              hint={`Max ${MAX_TENURE_YEARS} years`}
              value={form.tenureYears}
              onChange={update("tenureYears")}
              min={1}
              max={MAX_TENURE_YEARS}
              step={1}
            />
          </div>

          {activeTab === "prepayments" && (
            <div className="mt-8 border-t border-accent/15 pt-6">
              <div className="mb-4 rounded-xl border border-accent/15 bg-brand/30 p-3">
                <p className="text-xs font-semibold text-accent">
                  Repeat every calendar year
                </p>
                <p className="mt-1 text-[10px] text-accent/50">
                  Same as filling one row per year — use this for annual prepayment
                  habits.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-accent/50">Amount</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={repeatYearlyAmount}
                      onChange={(e) => setRepeatYearlyAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-accent/20 bg-brand/50 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-accent/50">Month</label>
                    <select
                      value={repeatYearlyMonth}
                      onChange={(e) => setRepeatYearlyMonth(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-accent/20 bg-brand/50 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                    >
                      {MONTH_LABELS.map((name, mi) => (
                        <option key={name} value={String(mi + 1)}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-accent">
                  Individual prepayments
                </h3>
                <button
                  type="button"
                  onClick={addPrepaymentEntry}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-lg font-bold text-brand"
                  aria-label="Add prepayment"
                >
                  +
                </button>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {prepaymentEntries.map((row, index) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-accent/15 bg-brand/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-accent/55">
                        Payment {index + 1}
                      </span>
                      {prepaymentEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrepaymentEntry(row.id)}
                          className="text-xs text-red-300 hover:text-red-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-accent/50">Year</label>
                        <select
                          value={row.calendarYear}
                          onChange={(e) =>
                            updatePrepaymentEntry(row.id, {
                              calendarYear: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-accent/20 bg-brand/50 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                        >
                          {calendarYearOptions.map((y) => (
                            <option key={y} value={String(y)}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-accent/50">Month</label>
                        <select
                          value={row.calendarMonth}
                          onChange={(e) =>
                            updatePrepaymentEntry(row.id, {
                              calendarMonth: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-accent/20 bg-brand/50 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                        >
                          {MONTH_LABELS.map((name, mi) => (
                            <option key={name} value={String(mi + 1)}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="text-[10px] text-accent/50">Amount</label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={row.amount}
                        onChange={(e) =>
                          updatePrepaymentEntry(row.id, {
                            amount: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-accent/20 bg-brand/50 px-2 py-2 text-sm text-accent outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "emiIncrease" && (
            <div className="mt-8 border-t border-accent/15 pt-6">
              <Field
                id="emiIncrease"
                label="EMI increase per year (%)"
                hint="From the start of each new loan year (year 2 onward)"
                value={emiIncreasePercent}
                onChange={setEmiIncreasePercent}
                min={0}
                max={50}
                step={0.5}
              />
            </div>
          )}
        </section>

        <section className="space-y-6 lg:col-span-2">
          {activeSchedule ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ResultCard
                  label="Monthly EMI"
                  value={formatCurrency(activeSchedule.monthlyEmi)}
                  highlight
                />
                <ResultCard
                  label="Payoff"
                  value={formatTenure(activeSchedule.monthsToPayoff)}
                />
                <ResultCard
                  label="Total interest"
                  value={formatCurrency(activeSchedule.totalInterest)}
                />
                <ResultCard
                  label="Total paid"
                  value={formatCurrency(activeSchedule.totalAmount)}
                  subValue={
                    activeSchedule.totalPenalty > 0
                      ? `Includes ${formatCurrency(activeSchedule.totalPenalty)} penalty`
                      : undefined
                  }
                />
              </div>

              {contributors.some((c) => c.monthlyShare > 0) && (
                <ContributorBreakdown
                  contributors={contributors.filter((c) => c.monthlyShare > 0)}
                  monthlyEmi={activeSchedule.monthlyEmi}
                />
              )}

              {activeTab === "prepayments" &&
                baselineSchedule &&
                prepaymentSchedule &&
                prepaymentComparison && (
                  <>
                    <ComparisonBanner
                      baseline={baselineSchedule}
                      modified={prepaymentSchedule}
                      comparison={prepaymentComparison}
                      modifiedLabel="prepayments"
                    />
                    <PrepaymentEducation
                      loanOptions={baseLoanOptions}
                      baseline={baselineSchedule}
                      modified={prepaymentSchedule}
                      samplePrepaymentAmount={samplePrepaymentAmount}
                    />
                  </>
                )}

              {activeTab === "prepayments" &&
                baselineSchedule &&
                !prepaymentSchedule && (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Add a prepayment (individual row or repeat yearly) to see
                    impact.
                  </p>
                )}

              {activeTab === "emiIncrease" &&
                baselineSchedule &&
                emiIncreaseSchedule &&
                emiIncreaseComparison && (
                  <>
                    <ComparisonBanner
                      baseline={baselineSchedule}
                      modified={emiIncreaseSchedule}
                      comparison={emiIncreaseComparison}
                      modifiedLabel={`${emiIncreasePercentNum}% yearly EMI increase`}
                    />
                    <BalanceChart
                      baseline={baselineSchedule}
                      modified={emiIncreaseSchedule}
                    />
                  </>
                )}

              {activeTab === "emiIncrease" &&
                baselineSchedule &&
                !emiIncreaseSchedule && (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Enter an EMI increase % greater than 0.
                  </p>
                )}

              <div>
                <h2 className="mb-3 text-lg font-semibold text-accent">
                  Amortization schedule
                </h2>
                <ScheduleTable
                  schedule={activeSchedule}
                  highlightPrepayments={activeTab === "prepayments"}
                />
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-8 text-center text-amber-100">
              Enter valid loan details.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
