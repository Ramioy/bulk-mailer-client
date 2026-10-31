import { describe, expect, it } from 'vitest';

import type { ProgressEvent, StoredProgressEvent } from '../types';
import { HttpTransport } from './http-transport';
import { followProgress } from './progress-follower';
import { memorySessionStorage } from './session-storage';
import { json, scriptedFetch, session, stream } from './test-support';

const counters = { total: 2, processed: 0, byState: {}, byErrorType: {} };
const sse = (id: number, event: ProgressEvent) => `id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

function collect(transport: HttpTransport, afterSeq: number) {
  const events: StoredProgressEvent[] = [];
  return new Promise<StoredProgressEvent[]>((resolve) => {
    followProgress(transport, 'ex-1', afterSeq, { onEvent: (e) => events.push(e), onClosed: () => resolve(events) }, { retryDelaysMs: [1] });
  });
}

describe('followProgress', () => {
  it('renews the token on TOKEN_EXPIRED and resumes with Last-Event-ID, skipping replayed events', async () => {
    let connections = 0;
    const { fetch, calls } = scriptedFetch((call) => {
      if (call.url === '/auth/refresh') return json(200, session(2));
      connections += 1;
      if (connections === 1) return stream(`${sse(4, { type: 'STARTED', counters })}event: TOKEN_EXPIRED\ndata: {}\n\n`);
      // The server replays from Last-Event-ID; an old event is ignored anyway.
      return stream(`${sse(4, { type: 'STARTED', counters })}${sse(5, { type: 'FINISHED', batchState: 'COMPLETED', counters: { ...counters, processed: 2 } })}`);
    });
    const transport = new HttpTransport('', memorySessionStorage(session(1)), fetch);
    const events = await collect(transport, 3);

    expect(events.map((e) => [e.seq, e.event.type])).toEqual([
      [4, 'STARTED'],
      [5, 'FINISHED'],
    ]);
    const streams = calls.filter((c) => c.url === '/executions/ex-1/events');
    expect(streams[0]?.headers).toMatchObject({ authorization: 'Bearer access-1', 'last-event-id': '3' });
    expect(streams[1]?.headers).toMatchObject({ authorization: 'Bearer access-2', 'last-event-id': '4' });
  });

  it('reconnects after a dropped stream and stops when the execution is already finished', async () => {
    const { fetch, calls } = scriptedFetch((call) => {
      if (call.url === '/executions/ex-1') return json(200, { finishedAt: '2026-10-31T00:00:00Z' });
      return stream(sse(1, { type: 'STARTED', counters }));
    });
    const transport = new HttpTransport('', memorySessionStorage(session(1)), fetch);
    const events = await collect(transport, 0);
    expect(events.map((e) => e.seq)).toEqual([1]);
    expect(calls.map((c) => c.url)).toEqual(['/executions/ex-1/events', '/executions/ex-1']);
    // No Last-Event-ID on the first connection from the start.
    expect(calls[0]?.headers['last-event-id']).toBeUndefined();
  });
});
