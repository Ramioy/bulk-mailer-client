import type { Session } from '../types';
import type { FetchLike } from './http-transport';

export const session = (n: number): Session => ({
  operator: { operatorId: 'op-1', username: 'operador' },
  accessToken: `access-${n}`,
  accessExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  refreshToken: `refresh-${n}`,
  refreshExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
});

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const stream = (text: string) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );

export interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
}

/** A fetch that records calls and answers with the next handler's response. */
export function scriptedFetch(handler: (call: Call, index: number) => Response | Promise<Response>): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call: Call = {
      url,
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string>) },
      ...(typeof init?.body === 'string' ? { body: JSON.parse(init.body) } : {}),
    };
    calls.push(call);
    return handler(call, calls.length - 1);
  };
  return { fetch, calls };
}
