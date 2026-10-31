import { ApiError, NetworkError, SessionExpiredError } from '../errors';
import type { Session } from '../types';
import type { SessionStorage } from './session-storage';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface RequestOptions {
  readonly method?: string;
  readonly json?: unknown;
  readonly body?: BodyInit;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  /** Public route: no Authorization header. */
  readonly anonymous?: boolean;
}

/**
 * The only place that calls fetch. Adds `Authorization: Bearer`, and on `401 INVALID_ACCESS_TOKEN` renews the session
 * once with the refresh token (one renewal at a time, shared by concurrent requests) and repeats the request.
 */
export class HttpTransport {
  private refreshing: Promise<Session> | undefined;
  private readonly endedListeners = new Set<() => void>();

  constructor(
    private readonly baseUrl: string,
    private readonly storage: SessionStorage,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  get session(): Session | undefined {
    return this.storage.load();
  }

  setSession(session: Session): void {
    this.storage.save(session);
  }

  clearSession(): void {
    this.storage.clear();
  }

  onSessionEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => this.endedListeners.delete(listener);
  }

  /** JSON body of a successful answer (undefined for 204). */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** The raw successful response (used for SSE). */
  async send(path: string, options: RequestOptions = {}): Promise<Response> {
    let response = await this.once(path, options, options.anonymous ? undefined : await this.accessToken());
    if (response.status === 401 && !options.anonymous) {
      const error = await errorOf(response);
      if (error.code !== 'INVALID_ACCESS_TOKEN') throw error;
      const renewed = await this.renew();
      response = await this.once(path, options, renewed.accessToken);
      if (response.status === 401) {
        this.endSession();
        throw new SessionExpiredError();
      }
    }
    if (!response.ok) throw await errorOf(response);
    return response;
  }

  /** Renews the session with the refresh token; ends it if refused. */
  renew(): Promise<Session> {
    this.refreshing ??= this.doRenew().finally(() => {
      this.refreshing = undefined;
    });
    return this.refreshing;
  }

  private async doRenew(): Promise<Session> {
    const refreshToken = this.storage.load()?.refreshToken;
    if (!refreshToken) {
      this.endSession();
      throw new SessionExpiredError();
    }
    const response = await this.once('/auth/refresh', { method: 'POST', json: { refreshToken } }, undefined);
    if (!response.ok) {
      this.endSession();
      throw new SessionExpiredError();
    }
    const session = (await response.json()) as Session;
    this.storage.save(session);
    return session;
  }

  private async accessToken(): Promise<string> {
    const session = this.storage.load();
    if (!session) throw new SessionExpiredError();
    return session.accessToken;
  }

  private endSession(): void {
    const had = this.storage.load() !== undefined;
    this.storage.clear();
    if (had) for (const listener of this.endedListeners) listener();
  }

  private async once(path: string, options: RequestOptions, token: string | undefined): Promise<Response> {
    const headers: Record<string, string> = { ...options.headers };
    if (token) headers.authorization = `Bearer ${token}`;
    let body = options.body;
    if (options.json !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.json);
    }
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        ...(body === undefined ? {} : { body }),
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new NetworkError(error);
    }
  }
}

async function errorOf(response: Response): Promise<ApiError> {
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // not JSON: the status alone tells it
  }
  const { error, message: _message, statusCode: _statusCode, ...details } = body;
  return new ApiError(response.status, typeof error === 'string' ? error : `HTTP_${response.status}`, details);
}
