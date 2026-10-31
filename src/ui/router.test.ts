import { describe, expect, it } from 'vitest';

import { hrefOf, parseRoute } from './router';

describe('router', () => {
  it('round-trips every route', () => {
    for (const route of [
      { name: 'batch', period: '2026-10', block: 'CASH' },
      { name: 'execution', executionId: 'a/b c' },
      { name: 'alerts' },
      { name: 'suppressions' },
      { name: 'settings' },
    ] as const) {
      expect(parseRoute(hrefOf(route))).toEqual(route);
    }
    expect(parseRoute('')).toEqual({ name: 'batch' });
  });
});
