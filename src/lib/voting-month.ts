/** Same month key in client and server (UTC month). */
export function votingMonthLabel(): string {
  return new Date().toISOString().slice(0, 7);
}
