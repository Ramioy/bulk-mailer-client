import { describe, expect, it } from 'vitest';

import { operablePeriods, periodLabel, previousPeriod } from './periods';

describe('periods', () => {
  it('uses the business time zone: 1 Nov 03:00 UTC is still October in Bogotá', () => {
    expect(operablePeriods(new Date('2026-11-01T03:00:00Z'))).toEqual(['2026-10', '2026-09']);
    expect(operablePeriods(new Date('2026-11-01T06:00:00Z'))).toEqual(['2026-11', '2026-10']);
  });

  it('wraps the year and labels in Spanish', () => {
    expect(previousPeriod('2027-01')).toBe('2026-12');
    expect(periodLabel('2026-10')).toBe('octubre de 2026');
  });
});
