import type { ExecutionStatus, ExecutionWaiting, ProgressCounters, StoredProgressEvent } from '../api/types';

/** What the execution screen shows, folded from the status and the live events. */
export interface ProgressView {
  readonly counters: ProgressCounters;
  readonly lastSeq: number;
  readonly waiting?: ExecutionWaiting;
  readonly finished: boolean;
  readonly batchState?: string;
  readonly stopReason?: string;
  /** Newest first, at most LOG_SIZE. */
  readonly log: readonly StoredProgressEvent[];
}

export const LOG_SIZE = 200;

export function initialProgress(status: ExecutionStatus): ProgressView {
  return {
    counters: status.counters,
    lastSeq: status.lastEventSeq,
    ...(status.waiting ? { waiting: status.waiting } : {}),
    finished: status.finishedAt !== undefined,
    ...(status.batchState ? { batchState: status.batchState } : {}),
    ...(status.stopReason ? { stopReason: status.stopReason } : {}),
    log: [],
  };
}

/** Applies one SSE event; events at or before `lastSeq` (replayed after a reconnection) change nothing. */
export function applyProgress(view: ProgressView, stored: StoredProgressEvent): ProgressView {
  if (stored.seq <= view.lastSeq) return view;
  const event = stored.event;
  const log = [stored, ...view.log].slice(0, LOG_SIZE);
  const base = { ...view, lastSeq: stored.seq, log };
  switch (event.type) {
    case 'STARTED':
    case 'RECEIPT_PROCESSED': {
      const { waiting: _waiting, ...rest } = base;
      return { ...rest, counters: event.counters };
    }
    case 'WAITING':
      return { ...base, waiting: { reason: event.reason, seconds: event.seconds, consecutiveIncidents: event.consecutiveIncidents, nextSendAt: event.nextSendAt } };
    case 'FINISHED': {
      const { waiting: _waiting, ...rest } = base;
      return { ...rest, counters: event.counters, finished: true, batchState: event.batchState, ...(event.stopReason ? { stopReason: event.stopReason } : {}) };
    }
  }
}
