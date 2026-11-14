/** Short French label for the time until `due`: "5 min", "3 h", "8 j", "2 mois", "1,5 an". */
export function formatInterval(from: Date, due: Date): string {
  const minutes = Math.max(1, Math.round((due.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(minutes / 1440);
  if (days < 31) return `${days} j`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `${months} mois`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${String(years).replace('.', ',')} an${years >= 2 ? 's' : ''}`;
}

/** "12 min", "1 h 05" */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}
