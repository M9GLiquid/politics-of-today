/** UTC calendar month key YYYY-MM */
export function utcMonthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/** Month immediately before `publishMonth` (YYYY-MM). Used to pick draft voting pool. */
export function votingMonthBeforePublish(publishMonth: string): string {
  const [ys, ms] = publishMonth.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return publishMonth;
  }
  const prev = new Date(Date.UTC(y, m - 2, 1));
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Calendar quarter label, UTC (election period). */
export function leadershipPeriodKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

/** Previous quarter key (for finalizing elections at quarter boundary). */
export function previousLeadershipPeriodKey(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const q = Math.floor(m / 3) + 1;
  if (q > 1) {
    return `${y}-Q${q - 1}`;
  }
  return `${y - 1}-Q4`;
}
