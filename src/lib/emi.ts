export const MAX_TENURE_YEARS = 25;

export type RateMode = "fixed" | "variable";

export type EmiInput = {
  loanAmount: number;
  annualRate: number;
  tenureYears: number;
  rateMode?: RateMode;
  variableRatesByYear?: number[];
  emiStartYear: number;
  emiStartMonth: number;
};

export type YearlyPrepayment = {
  amount: number;
  monthInYear: number;
};

export type ExtraPayment = {
  atMonth: number;
  amount: number;
};

export type Contributor = {
  name: string;
  monthlyShare: number;
};

export type ScheduleOptions = EmiInput & {
  contributors?: Contributor[];
  prepaymentPenaltyPercent?: number;
  yearlyPrepayments?: YearlyPrepayment[];
  extraPayments?: ExtraPayment[];
  yearlyEmiIncreasePercent?: number[];
};

export type MonthRow = {
  monthIndex: number;
  year: number;
  monthInYear: number;
  calendarYear: number;
  calendarMonth: number;
  emiPaid: number;
  interestCharged: number;
  principalFromEmi: number;
  prepayment: number;
  penaltyCharged: number;
  totalPayment: number;
  balanceRemaining: number;
  annualRateApplied: number;
};

export type YearSchedule = {
  year: number;
  calendarYear: number;
  months: MonthRow[];
  totalEmi: number;
  totalInterest: number;
  totalPayment: number;
  totalPrepayment: number;
  totalPenalty: number;
};

export type ScheduleResult = {
  monthlyEmi: number;
  months: MonthRow[];
  years: YearSchedule[];
  principalAmount: number;
  totalInterest: number;
  totalAmount: number;
  totalPrepayment: number;
  totalPenalty: number;
  monthsToPayoff: number;
  rateMode: RateMode;
  emiStartYear: number;
  emiStartMonth: number;
  contributors: Contributor[];
};

export type ScheduleComparison = {
  monthsSaved: number;
  yearsSaved: number;
  remainingMonthsSaved: number;
  interestSaved: number;
  totalPaymentSaved: number;
  baselineMonths: number;
  modifiedMonths: number;
};

export type PrepaymentTimingPoint = {
  monthIndex: number;
  label: string;
  interestSaved: number;
  monthsSaved: number;
};

export function monthIndexFromYearMonth(year: number, monthInYear: number): number {
  return (year - 1) * 12 + monthInYear;
}

export function monthIndexToCalendar(
  monthIndex: number,
  startYear: number,
  startMonth: number,
): { calendarYear: number; calendarMonth: number } {
  const offset = monthIndex - 1 + startMonth - 1;
  return {
    calendarYear: startYear + Math.floor(offset / 12),
    calendarMonth: (offset % 12) + 1,
  };
}

export function calendarToMonthIndex(
  calendarYear: number,
  calendarMonth: number,
  startYear: number,
  startMonth: number,
): number {
  return (calendarYear - startYear) * 12 + (calendarMonth - startMonth) + 1;
}

export function calendarYearForLoanYear(
  loanYear: number,
  emiStartYear: number,
): number {
  return emiStartYear + loanYear - 1;
}

export function formatPeriodLabel(
  monthIndex: number,
  startYear: number,
  startMonth: number,
): string {
  const { calendarYear, calendarMonth } = monthIndexToCalendar(
    monthIndex,
    startYear,
    startMonth,
  );
  return `${MONTH_LABELS[calendarMonth - 1]} ${calendarYear}`;
}

export function formatLoanYearLabel(loanYear: number, emiStartYear: number): string {
  return String(calendarYearForLoanYear(loanYear, emiStartYear));
}

export function contributorSharePercent(
  share: number,
  totalEmi: number,
): number {
  if (totalEmi <= 0) return 0;
  return (share / totalEmi) * 100;
}

export function sumContributorShares(contributors: Contributor[]): number {
  return contributors.reduce((s, c) => s + c.monthlyShare, 0);
}

export function buildYearlyRepeatExtraPayments(
  amount: number,
  calendarMonth: number,
  emiStartYear: number,
  emiStartMonth: number,
  tenureYears: number,
): ExtraPayment[] {
  if (amount <= 0) return [];
  const years = Math.min(MAX_TENURE_YEARS, Math.ceil(tenureYears));
  const payments: ExtraPayment[] = [];

  for (let y = 0; y < years; y++) {
    const calYear = emiStartYear + y;
    const atMonth = calendarToMonthIndex(
      calYear,
      calendarMonth,
      emiStartYear,
      emiStartMonth,
    );
    if (atMonth > 0) {
      payments.push({ atMonth, amount });
    }
  }

  return payments;
}

export function validateLoanInput({
  loanAmount,
  annualRate,
  tenureYears,
  rateMode = "fixed",
  variableRatesByYear,
  emiStartYear,
  emiStartMonth,
}: EmiInput): boolean {
  if (
    loanAmount <= 0 ||
    tenureYears <= 0 ||
    tenureYears > MAX_TENURE_YEARS ||
    !Number.isFinite(loanAmount) ||
    !Number.isFinite(tenureYears) ||
    !Number.isFinite(emiStartYear) ||
    emiStartMonth < 1 ||
    emiStartMonth > 12
  ) {
    return false;
  }

  if (rateMode === "fixed") {
    return annualRate >= 0 && Number.isFinite(annualRate);
  }

  const yearsNeeded = Math.min(MAX_TENURE_YEARS, Math.ceil(tenureYears));
  if (!variableRatesByYear || variableRatesByYear.length < yearsNeeded) {
    return false;
  }

  return variableRatesByYear
    .slice(0, yearsNeeded)
    .every((r) => r >= 0 && Number.isFinite(r));
}

export function getMonthlyRate(annualRate: number): number {
  return annualRate / 12 / 100;
}

export function getAnnualRateForYear(year: number, options: EmiInput): number {
  if (options.rateMode === "variable" && options.variableRatesByYear) {
    const idx = year - 1;
    const rates = options.variableRatesByYear;
    if (idx < rates.length) return rates[idx]!;
    return rates[rates.length - 1] ?? options.annualRate;
  }
  return options.annualRate;
}

export function computeMonthlyEmi(
  loanAmount: number,
  annualRate: number,
  tenureYears: number,
): number {
  const months = Math.max(1, Math.round(tenureYears * 12));
  const monthlyRate = getMonthlyRate(annualRate);

  if (monthlyRate === 0) {
    return loanAmount / months;
  }

  const factor = Math.pow(1 + monthlyRate, months);
  return (loanAmount * monthlyRate * factor) / (factor - 1);
}

function getPrepaymentPrincipal(
  monthIndex: number,
  yearlyPrepayments: YearlyPrepayment[] | undefined,
  extraPayments: ExtraPayment[] | undefined,
): number {
  let prepayment = 0;

  if (extraPayments) {
    for (const extra of extraPayments) {
      if (extra.atMonth === monthIndex && extra.amount > 0) {
        prepayment += extra.amount;
      }
    }
  }

  if (yearlyPrepayments) {
    const year = Math.ceil(monthIndex / 12);
    const monthInYear = ((monthIndex - 1) % 12) + 1;
    const yearly = yearlyPrepayments[year - 1];
    if (yearly && yearly.amount > 0 && yearly.monthInYear === monthInYear) {
      prepayment += yearly.amount;
    }
  }

  return prepayment;
}

function computePrepaymentPenalty(
  prepaymentPrincipal: number,
  options: ScheduleOptions,
): number {
  if (
    prepaymentPrincipal <= 0 ||
    options.rateMode !== "fixed" ||
    !options.prepaymentPenaltyPercent ||
    options.prepaymentPenaltyPercent <= 0
  ) {
    return 0;
  }
  return (prepaymentPrincipal * options.prepaymentPenaltyPercent) / 100;
}

export function buildAmortizationSchedule(
  options: ScheduleOptions,
): ScheduleResult | null {
  if (!validateLoanInput(options)) {
    return null;
  }

  const rateMode = options.rateMode ?? "fixed";
  const maxMonths = options.tenureYears * 12;
  const safetyCap = maxMonths + 600;
  const contributors =
    options.contributors && options.contributors.length > 0
      ? options.contributors
      : [{ name: "Borrower", monthlyShare: 0 }];

  let balance = options.loanAmount;
  let currentAnnualRate = getAnnualRateForYear(1, options);
  let monthlyEmi = computeMonthlyEmi(
    balance,
    currentAnnualRate,
    options.tenureYears,
  );
  const initialMonthlyEmi = monthlyEmi;

  const months: MonthRow[] = [];
  let totalInterest = 0;
  let totalPrepayment = 0;
  let totalPenalty = 0;

  for (let monthIndex = 1; monthIndex <= safetyCap && balance > 0.01; monthIndex++) {
    const year = Math.ceil(monthIndex / 12);
    const monthInYear = ((monthIndex - 1) % 12) + 1;
    const { calendarYear, calendarMonth } = monthIndexToCalendar(
      monthIndex,
      options.emiStartYear,
      options.emiStartMonth,
    );
    const annualRate = getAnnualRateForYear(year, options);

    if (rateMode === "variable" && monthInYear === 1 && annualRate !== currentAnnualRate) {
      currentAnnualRate = annualRate;
      const remainingMonths = Math.max(1, maxMonths - monthIndex + 1);
      monthlyEmi = computeMonthlyEmi(
        balance,
        currentAnnualRate,
        remainingMonths / 12,
      );
    }

    if (monthInYear === 1 && year > 1 && options.yearlyEmiIncreasePercent) {
      const increaseIdx = year - 2;
      const pct = options.yearlyEmiIncreasePercent[increaseIdx] ?? 0;
      if (pct > 0) {
        monthlyEmi *= 1 + pct / 100;
      }
    }

    const monthlyRate = getMonthlyRate(annualRate);
    const interestCharged = monthlyRate === 0 ? 0 : balance * monthlyRate;
    let emiPaid = monthlyEmi;
    let principalFromEmi = emiPaid - interestCharged;

    if (principalFromEmi < 0) {
      principalFromEmi = 0;
    }

    if (principalFromEmi > balance) {
      emiPaid = interestCharged + balance;
      principalFromEmi = balance;
    }

    let prepaymentPrincipal = getPrepaymentPrincipal(
      monthIndex,
      options.yearlyPrepayments,
      options.extraPayments,
    );

    if (prepaymentPrincipal > 0) {
      const maxExtra = balance - principalFromEmi;
      if (prepaymentPrincipal > maxExtra) {
        prepaymentPrincipal = Math.max(0, maxExtra);
      }
    }

    const penaltyCharged = computePrepaymentPenalty(
      prepaymentPrincipal,
      options,
    );
    const totalPayment = emiPaid + prepaymentPrincipal + penaltyCharged;
    balance = Math.max(0, balance - principalFromEmi - prepaymentPrincipal);

    totalInterest += interestCharged;
    totalPrepayment += prepaymentPrincipal;
    totalPenalty += penaltyCharged;

    months.push({
      monthIndex,
      year,
      monthInYear,
      calendarYear,
      calendarMonth,
      emiPaid,
      interestCharged,
      principalFromEmi,
      prepayment: prepaymentPrincipal,
      penaltyCharged,
      totalPayment,
      balanceRemaining: balance,
      annualRateApplied: annualRate,
    });
  }

  const years = groupMonthsByYear(months, options.emiStartYear);
  const totalAmount = months.reduce((sum, row) => sum + row.totalPayment, 0);

  return {
    monthlyEmi: initialMonthlyEmi,
    months,
    years,
    principalAmount: options.loanAmount,
    totalInterest,
    totalAmount,
    totalPrepayment,
    totalPenalty,
    monthsToPayoff: months.length,
    rateMode,
    emiStartYear: options.emiStartYear,
    emiStartMonth: options.emiStartMonth,
    contributors,
  };
}

function groupMonthsByYear(
  months: MonthRow[],
  emiStartYear: number,
): YearSchedule[] {
  const map = new Map<number, MonthRow[]>();

  for (const row of months) {
    const existing = map.get(row.year) ?? [];
    existing.push(row);
    map.set(row.year, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, yearMonths]) => ({
      year,
      calendarYear: calendarYearForLoanYear(year, emiStartYear),
      months: yearMonths,
      totalEmi: yearMonths.reduce((s, m) => s + m.emiPaid, 0),
      totalInterest: yearMonths.reduce((s, m) => s + m.interestCharged, 0),
      totalPayment: yearMonths.reduce((s, m) => s + m.totalPayment, 0),
      totalPrepayment: yearMonths.reduce((s, m) => s + m.prepayment, 0),
      totalPenalty: yearMonths.reduce((s, m) => s + m.penaltyCharged, 0),
    }));
}

export function compareSchedules(
  baseline: ScheduleResult,
  modified: ScheduleResult,
): ScheduleComparison {
  const monthsSaved = baseline.monthsToPayoff - modified.monthsToPayoff;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainingMonthsSaved = monthsSaved % 12;

  return {
    monthsSaved,
    yearsSaved,
    remainingMonthsSaved,
    interestSaved: baseline.totalInterest - modified.totalInterest,
    totalPaymentSaved: baseline.totalAmount - modified.totalAmount,
    baselineMonths: baseline.monthsToPayoff,
    modifiedMonths: modified.monthsToPayoff,
  };
}

export function buildPrepaymentTimingAnalysis(
  baseOptions: ScheduleOptions,
  prepaymentAmount: number,
  sampleCount = 8,
): PrepaymentTimingPoint[] {
  const baseline = buildAmortizationSchedule(baseOptions);
  if (!baseline || prepaymentAmount <= 0) return [];

  const maxMonth = Math.min(baseline.monthsToPayoff, baseOptions.tenureYears * 12);
  const step = Math.max(1, Math.floor(maxMonth / sampleCount));
  const points: PrepaymentTimingPoint[] = [];

  for (let atMonth = 1; atMonth <= maxMonth; atMonth += step) {
    const modified = buildAmortizationSchedule({
      ...baseOptions,
      extraPayments: [{ atMonth, amount: prepaymentAmount }],
    });
    if (!modified) continue;

    const comparison = compareSchedules(baseline, modified);

    points.push({
      monthIndex: atMonth,
      label: formatPeriodLabel(
        atMonth,
        baseOptions.emiStartYear,
        baseOptions.emiStartMonth,
      ),
      interestSaved: Math.max(0, comparison.interestSaved),
      monthsSaved: Math.max(0, comparison.monthsSaved),
    });
  }

  return points;
}

export function compareEarlyVsLatePrepayment(
  baseOptions: ScheduleOptions,
  prepaymentAmount: number,
): {
  early: PrepaymentTimingPoint | null;
  late: PrepaymentTimingPoint | null;
  extraInterestIfLate: number;
} {
  const baseline = buildAmortizationSchedule(baseOptions);
  if (!baseline || prepaymentAmount <= 0) {
    return { early: null, late: null, extraInterestIfLate: 0 };
  }

  const earlyMonth = 1;
  const lateMonth = Math.min(12, baseline.monthsToPayoff);

  const simulate = (atMonth: number): PrepaymentTimingPoint | null => {
    const modified = buildAmortizationSchedule({
      ...baseOptions,
      extraPayments: [{ atMonth, amount: prepaymentAmount }],
    });
    if (!modified) return null;
    const comparison = compareSchedules(baseline, modified);
    return {
      monthIndex: atMonth,
      label:
        atMonth === earlyMonth
          ? formatPeriodLabel(
              earlyMonth,
              baseOptions.emiStartYear,
              baseOptions.emiStartMonth,
            )
          : formatPeriodLabel(
              lateMonth,
              baseOptions.emiStartYear,
              baseOptions.emiStartMonth,
            ),
      interestSaved: Math.max(0, comparison.interestSaved),
      monthsSaved: Math.max(0, comparison.monthsSaved),
    };
  };

  const early = simulate(earlyMonth);
  const late = simulate(lateMonth);
  const extraInterestIfLate =
    early && late ? Math.max(0, early.interestSaved - late.interestSaved) : 0;

  return { early, late, extraInterestIfLate };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTenure(months: number): string {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} month${remainingMonths === 1 ? "" : "s"}`;
  }

  if (remainingMonths === 0) {
    return `${years} year${years === 1 ? "" : "s"}`;
  }

  return `${years} year${years === 1 ? "" : "s"} ${remainingMonths} month${remainingMonths === 1 ? "" : "s"}`;
}

export function formatSavings(comparison: ScheduleComparison): string {
  if (comparison.monthsSaved <= 0) {
    return "No tenure reduction";
  }

  const years = Math.floor(comparison.monthsSaved / 12);
  const months = comparison.monthsSaved % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} year${years === 1 ? "" : "s"}`);
  }
  if (months > 0) {
    parts.push(`${months} month${months === 1 ? "" : "s"}`);
  }

  return parts.join(" ");
}

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getDefaultEmiStart(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
