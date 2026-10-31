import { describe, expect, it } from 'vitest';

import type { ExecutionStatus } from '../api/types';
import { applyProgress, initialProgress } from './progress';

const status: ExecutionStatus = {
  executionId: 'ex-1',
  period: '2026-10',
  block: 'CASH',
  manifestVersion: 1,
  startedBy: 'op',
  startedAt: '2026-10-31T00:00:00Z',
  counters: { total: 2, processed: 1, byState: { SENT: 1 }, byErrorType: {} },
  lastEventSeq: 2,
};

describe('progress fold', () => {
  it('ignores replayed events, shows and clears the wait, and finishes', () => {
    let view = initialProgress(status);
    view = applyProgress(view, { seq: 2, event: { type: 'STARTED', counters: { total: 9, processed: 0, byState: {}, byErrorType: {} } } });
    expect(view.counters.total).toBe(2);

    view = applyProgress(view, { seq: 3, event: { type: 'WAITING', reason: 'PROVIDER_UNAVAILABLE', seconds: 30, consecutiveIncidents: 1, nextSendAt: '2026-10-31T00:01:00Z' } });
    expect(view.waiting?.seconds).toBe(30);

    view = applyProgress(view, { seq: 4, event: { type: 'FINISHED', batchState: 'COMPLETED', counters: { total: 2, processed: 2, byState: { SENT: 2 }, byErrorType: {} } } });
    expect(view).toMatchObject({ finished: true, batchState: 'COMPLETED', lastSeq: 4, counters: { processed: 2 } });
    expect(view.waiting).toBeUndefined();
    expect(view.log.map((e) => e.seq)).toEqual([4, 3]);
  });
});
