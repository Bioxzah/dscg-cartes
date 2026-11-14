/** Calendar days from `now` to `target`, both read in local time. Negative once the date is past. */
export function daysUntil(target: Date, now: Date): number {
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** Default exam date (spec 4.3): 1 October 2027. Becomes a setting in milestone 2. */
export const DEFAULT_EXAM_DATE = new Date(2027, 9, 1);
