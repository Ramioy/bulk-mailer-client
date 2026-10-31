import { describe, expect, it } from 'vitest';

import { ApiError, NetworkError, SessionExpiredError } from '../errors';
import { HttpTransport } from './http-transport';
import { memorySessionStorage } from './session-storage';
import { json, scriptedFetch, session } from './test-support';

describe('HttpTransport', () => {
  it('sends the Bearer token and returns the JSON body', async () => {
    const { fetch, calls } = scriptedFetch(() => json(200, { ok: 1 }));
    const transport = new HttpTransport('http://api', memorySessionStorage(session(1)), fetch);
    expect(await transport.request('/concepts')).toEqual({ ok: 1 });
    expect(calls[0]).toMatchObject({ url: 'http://api/concepts', headers: { authorization: 'Bearer access-1' } });
  });

  it('renews once on 401 INVALID_ACCESS_TOKEN and repeats the request with the new token', async () => {
    const { fetch, calls } = scriptedFetch((call) => {
      if (call.url.endsWith('/auth/refresh')) return json(200, session(2));
      return call.headers.authorization === 'Bearer access-2' ? json(200, { ok: 2 }) : json(401, { error: 'INVALID_ACCESS_TOKEN' });
    });
    const storage = memorySessionStorage(session(1));
    const transport = new HttpTransport('', storage, fetch);
    // Two concurrent requests share one renewal.
    const results = await Promise.all([transport.request('/a'), transport.request('/b')]);
    expect(results).toEqual([{ ok: 2 }, { ok: 2 }]);
    expect(calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
    expect(calls.find((c) => c.url === '/auth/refresh')?.body).toEqual({ refreshToken: 'refresh-1' });
    expect(calls.find((c) => c.url === '/auth/refresh')?.headers.authorization).toBeUndefined();
    expect(storage.load()?.accessToken).toBe('access-2');
  });

  it('ends the session when the refresh is refused', async () => {
    const { fetch } = scriptedFetch((call) => (call.url === '/auth/refresh' ? json(401, { error: 'INVALID_REFRESH_TOKEN' }) : json(401, { error: 'INVALID_ACCESS_TOKEN' })));
    const storage = memorySessionStorage(session(1));
    const transport = new HttpTransport('', storage, fetch);
    let ended = 0;
    transport.onSessionEnded(() => (ended += 1));
    await expect(transport.request('/a')).rejects.toBeInstanceOf(SessionExpiredError);
    expect(storage.load()).toBeUndefined();
    expect(ended).toBe(1);
  });

  it('turns a refusal into ApiError with its code and details, and a failed fetch into NetworkError', async () => {
    const { fetch } = scriptedFetch((call) => {
      if (call.url === '/down') throw new TypeError('Failed to fetch');
      return json(409, { error: 'MANIFEST_CHANGED', currentVersion: 3, differences: [] });
    });
    const transport = new HttpTransport('', memorySessionStorage(session(1)), fetch);
    const error = await transport.request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'MANIFEST_CHANGED', details: { currentVersion: 3, differences: [] } });
    await expect(transport.request('/down')).rejects.toBeInstanceOf(NetworkError);
  });

  it('does not try to renew on other 401 codes of public routes', async () => {
    const { fetch, calls } = scriptedFetch(() => json(401, { error: 'WRONG_PASSWORD' }));
    const transport = new HttpTransport('', memorySessionStorage(), fetch);
    await expect(transport.request('/auth/sign-in', { method: 'POST', json: {}, anonymous: true })).rejects.toMatchObject({ code: 'WRONG_PASSWORD' });
    expect(calls).toHaveLength(1);
  });
});
