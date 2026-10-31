import type { BulkMailerApi } from '../api/ports';

const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected call: ${name}`));

/** A BulkMailerApi whose every operation fails unless the test overrides it. */
export function fakeApi(overrides: { [K in keyof BulkMailerApi]?: Partial<BulkMailerApi[K]> } = {}): BulkMailerApi {
  const proxy = <T extends object>(area: string, impl: Partial<T> = {}): T =>
    new Proxy(impl as T, { get: (target, prop: string) => (prop in target ? (target as Record<string, unknown>)[prop] : unexpected(`${area}.${prop}`)) });
  return {
    auth: proxy('auth', { onSessionEnded: () => () => undefined, ...overrides.auth }),
    batches: proxy('batches', overrides.batches),
    executions: proxy('executions', overrides.executions),
    alerts: proxy('alerts', overrides.alerts),
    admin: proxy('admin', overrides.admin),
    suppressions: proxy('suppressions', overrides.suppressions),
    system: proxy('system', overrides.system),
  };
}
