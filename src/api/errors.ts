/** A refusal of the backend: HTTP status plus its `{ error, ...details }` body (typed error codes, §11). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }
}

/** The backend could not be reached at all (network, CORS, server down). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('NETWORK_ERROR', { cause });
    this.name = 'NetworkError';
  }
}

/** The session is over (refresh token rejected or missing): the operator must sign in again. */
export class SessionExpiredError extends Error {
  constructor() {
    super('SESSION_EXPIRED');
    this.name = 'SessionExpiredError';
  }
}
