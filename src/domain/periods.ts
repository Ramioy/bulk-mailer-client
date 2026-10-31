/** The business time zone: periods are calendar months there (§3). */
export const BUSINESS_TIME_ZONE = 'America/Bogota';

/** `YYYY-MM` of the given instant in the business time zone. */
export function periodOf(now: Date, timeZone = BUSINESS_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

export function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** Only the current period and the previous one can be operated (PERIOD_NOT_OPERABLE otherwise). */
export function operablePeriods(now: Date, timeZone = BUSINESS_TIME_ZONE): readonly [current: string, previous: string] {
  const current = periodOf(now, timeZone);
  return [current, previousPeriod(current)];
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number) as [number, number];
  return `${MONTHS[month - 1] ?? '?'} de ${year}`;
}
