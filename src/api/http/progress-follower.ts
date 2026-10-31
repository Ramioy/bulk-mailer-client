import { ApiError, SessionExpiredError } from '../errors';
import type { ProgressHandlers, ProgressSubscription } from '../ports';
import type { ProgressEvent } from '../types';
import type { HttpTransport } from './http-transport';
import { SseParser } from './sse-parser';

export interface FollowOptions {
  /** Waits between reconnections after a lost connection (ms); the last one repeats. */
  readonly retryDelaysMs?: readonly number[];
}

/**
 * D11/D12: follows an execution's SSE with fetch + `Authorization: Bearer`. On TOKEN_EXPIRED it renews the token and
 * reconnects with `Last-Event-ID`; on a lost connection it waits and does the same. Stops after FINISHED, on close(),
 * or when the session ends.
 */
export function followProgress(transport: HttpTransport, executionId: string, afterSeq: number, handlers: ProgressHandlers, options: FollowOptions = {}): ProgressSubscription {
  const delays = options.retryDelaysMs ?? [1000, 2000, 5000];
  const controller = new AbortController();
  let lastSeq = afterSeq;
  let closed = false;

  const finish = () => {
    if (closed) return;
    closed = true;
    controller.abort();
    handlers.onClosed?.();
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      controller.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      });
    });

  /** One connection; returns how it ended. */
  const connect = async (): Promise<'FINISHED' | 'TOKEN_EXPIRED' | 'ENDED'> => {
    const response = await transport.send(`/executions/${encodeURIComponent(executionId)}/events`, {
      headers: { accept: 'text/event-stream', ...(lastSeq > 0 ? { 'last-event-id': String(lastSeq) } : {}) },
      signal: controller.signal,
    });
    handlers.onConnectionProblem?.(undefined);
    if (!response.body) return 'ENDED';
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    const parser = new SseParser();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return 'ENDED';
      for (const message of parser.push(value)) {
        if (message.event === 'TOKEN_EXPIRED') return 'TOKEN_EXPIRED';
        const seq = Number(message.id);
        if (!Number.isFinite(seq) || seq <= lastSeq) continue;
        lastSeq = seq;
        const event = JSON.parse(message.data) as ProgressEvent;
        handlers.onEvent({ seq, event });
        if (event.type === 'FINISHED') {
          await reader.cancel().catch(() => undefined);
          return 'FINISHED';
        }
      }
    }
  };

  void (async () => {
    let failures = 0;
    while (!controller.signal.aborted) {
      try {
        const ended = await connect();
        if (ended === 'FINISHED') break;
        if (ended === 'TOKEN_EXPIRED') {
          await transport.renew();
          failures = 0;
          continue;
        }
        // The stream closed without FINISHED: the server restarted, or the execution had already finished (the
        // server closes at once then). Reconnecting replays what is missing, unless it is over.
        const status = await transport.request<{ finishedAt?: string }>(`/executions/${encodeURIComponent(executionId)}`, { signal: controller.signal });
        if (status.finishedAt) break;
        failures += 1;
      } catch (error) {
        if (closed) break;
        if (error instanceof SessionExpiredError) break;
        if (error instanceof ApiError && error.status === 404) {
          handlers.onConnectionProblem?.('EXECUTION_NOT_FOUND');
          break;
        }
        failures += 1;
        handlers.onConnectionProblem?.(error instanceof Error ? error.message : String(error));
      }
      if (failures > 0) await sleep(delays[Math.min(failures - 1, delays.length - 1)] ?? 1000);
    }
    finish();
  })();

  return { close: finish };
}
