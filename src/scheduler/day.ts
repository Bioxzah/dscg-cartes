// Study days start at `hour` (4 h by default), local time. A review at 2 h belongs to the previous day.

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD of the study day containing `date`. */
export function studyDayKey(date: Date, hour: number): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - hour, date.getMinutes());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Start (inclusive) and end (exclusive) of the study day containing `now`. */
export function studyDayBounds(now: Date, hour: number): { start: Date; end: Date } {
  const [y, m, d] = studyDayKey(now, hour).split('-').map(Number) as [number, number, number];
  return { start: new Date(y, m - 1, d, hour), end: new Date(y, m - 1, d + 1, hour) };
}

/** Key of the study day before `key`. */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const p = new Date(y, m - 1, d - 1, 12);
  return `${p.getFullYear()}-${pad(p.getMonth() + 1)}-${pad(p.getDate())}`;
}

/** Calendar days from `now` to `target`, both read in local time. Negative once the date is past. */
export function daysUntil(target: Date, now: Date): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** Parses YYYY-MM-DD as a local date. */
export function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}
