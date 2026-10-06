const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function cycleStart(month: string, day: number): string {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year, number - 1 - (day === 1 ? 0 : 1), 1, 12);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth()+1, 0).getDate()));
  return iso(date);
}
export function cycleBounds(month: string, day: number) {
  const [year, number] = month.split('-').map(Number);
  const next = new Date(year, number, 1, 12);
  const endExclusive = cycleStart(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`, day);
  const end = new Date(`${endExclusive}T12:00:00`); end.setDate(end.getDate()-1);
  return { start: cycleStart(month, day), end: iso(end), endExclusive };
}
export function cycleMonth(date: string, day: number): string {
  const month = date.slice(0,7);
  if (day === 1) return month;
  const [year, number] = month.split('-').map(Number);
  const next = new Date(year, number, 1, 12);
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
  return date >= cycleStart(nextMonth, day) ? nextMonth : month;
}
export function inCycle(date: string, month: string, day: number): boolean {
  const bounds = cycleBounds(month, day);
  return date >= bounds.start && date < bounds.endExclusive;
}
