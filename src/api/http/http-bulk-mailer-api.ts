import { ApiError } from '../errors';
import type { BulkMailerApi } from '../ports';
import type {
  AbortResult,
  Alert,
  ArchiveCopySetting,
  BatchSummary,
  Block,
  Concept,
  ExecutionStatus,
  Health,
  InstanceStatus,
  Operator,
  RefreshResult,
  Session,
  SuppressionList,
  UploadSummary,
} from '../types';
import { HttpTransport, type FetchLike } from './http-transport';
import { followProgress, type FollowOptions } from './progress-follower';
import { browserSessionStorage, type SessionStorage } from './session-storage';

const seg = encodeURIComponent;
const batchPath = (period: string, block: Block) => `/batches/${seg(period)}/${seg(block)}`;

export interface HttpApiOptions {
  readonly baseUrl: string;
  readonly storage?: SessionStorage;
  readonly fetch?: FetchLike;
  readonly follow?: FollowOptions;
}

/** Adapter of every port over the backend's HTTP API. */
export function createHttpApi(options: HttpApiOptions): BulkMailerApi {
  const transport = new HttpTransport(options.baseUrl.replace(/\/$/, ''), options.storage ?? browserSessionStorage(), options.fetch);
  const post = <T>(path: string, json?: unknown) => transport.request<T>(path, { method: 'POST', json: json ?? {} });

  return {
    auth: {
      async restore(): Promise<Operator | undefined> {
        const stored = transport.session;
        if (!stored) return undefined;
        if (new Date(stored.refreshExpiresAt).getTime() <= Date.now()) {
          transport.clearSession();
          return undefined;
        }
        try {
          // Validates the stored access token (renewing it if it expired).
          await transport.request('/auth/me');
          return transport.session?.operator;
        } catch {
          transport.clearSession();
          return undefined;
        }
      },
      async signIn(username, password) {
        const session = await transport.request<Session>('/auth/sign-in', { method: 'POST', json: { username, password }, anonymous: true });
        transport.setSession(session);
        return session.operator;
      },
      async signOut() {
        const refreshToken = transport.session?.refreshToken;
        transport.clearSession();
        if (refreshToken) await transport.request('/auth/sign-out', { method: 'POST', json: { refreshToken }, anonymous: true }).catch(() => undefined);
      },
      onSessionEnded: (listener) => transport.onSessionEnded(listener),
    },

    batches: {
      summary: (period, block) => transport.request<BatchSummary>(batchPath(period, block)),
      upload(period, block, files) {
        const form = new FormData();
        for (const file of files) form.append('files', file, file.name);
        return transport.request<UploadSummary>(`${batchPath(period, block)}/receipts`, { method: 'POST', body: form });
      },
      refreshRecipients: (period, block) => post<RefreshResult>(`${batchPath(period, block)}/refresh-recipients`),
      releaseFiles: (period, block, note) => post(`${batchPath(period, block)}/release-files`, { note }),
      removeReceipt: (sha256) => transport.request(`/receipts/${seg(sha256)}`, { method: 'DELETE' }),
      resolveConflict: (sha256, fileName, note) => post(`/receipts/${seg(sha256)}/resolve-conflict`, { fileName, note }),
      resolveUncertain: (sha256, outcome, note) => post(`/receipts/${seg(sha256)}/resolve`, { outcome, note }),
      resend: (sha256) => post(`/receipts/${seg(sha256)}/resend`),
      verifyDelivery: (sha256) => post(`/receipts/${seg(sha256)}/verify-delivery`),
    },

    executions: {
      start: (period, block, manifestVersion) => post<{ executionId: string }>(`${batchPath(period, block)}/executions`, { manifestVersion }),
      async current() {
        try {
          return await transport.request<ExecutionStatus>('/executions/current');
        } catch (error) {
          if (error instanceof ApiError && error.code === 'NO_EXECUTION') return undefined;
          throw error;
        }
      },
      get: (executionId) => transport.request<ExecutionStatus>(`/executions/${seg(executionId)}`),
      abort: (executionId, note, force) => post<AbortResult>(`/executions/${seg(executionId)}/abort`, { note, ...(force ? { force: true } : {}) }),
      follow: (executionId, afterSeq, handlers) => followProgress(transport, executionId, afterSeq, handlers, options.follow),
    },

    alerts: {
      list(query) {
        const params = new URLSearchParams();
        if (query.pending !== undefined) params.set('pending', String(query.pending));
        if (query.resolved !== undefined) params.set('resolved', String(query.resolved));
        if (query.type) params.set('type', query.type);
        if (query.subject) params.set('subject', query.subject);
        if (query.limit !== undefined) params.set('limit', String(query.limit));
        const qs = params.toString();
        return transport.request<Alert[]>(`/alerts${qs ? `?${qs}` : ''}`);
      },
      acknowledge: (alertId, note) => post<Alert>(`/alerts/${seg(alertId)}/acknowledge`, note ? { note } : {}),
    },

    admin: {
      concepts: async () => (await transport.request<{ concepts: Concept[] }>('/concepts')).concepts,
      addConcept: (key, subject) => post<Concept>('/concepts', { key, subject }),
      updateConcept: (key, change) => transport.request<Concept>(`/concepts/${seg(key)}`, { method: 'PATCH', json: change }),
      archiveCopy: () => transport.request<ArchiveCopySetting>('/settings/archive-copy'),
      setArchiveCopy: (enabled) => transport.request<ArchiveCopySetting>('/settings/archive-copy', { method: 'PUT', json: { enabled } }),
    },

    suppressions: {
      list: () => transport.request<SuppressionList>('/suppressions'),
      release: (email, request) => post(`/suppressions/${seg(email)}/release`, request),
    },

    system: {
      async health(): Promise<Health> {
        try {
          return await transport.request<Health>('/health', { anonymous: true });
        } catch (error) {
          if (error instanceof ApiError && error.status === 503) return { status: 'degraded', ...(error.details.checks ? { checks: error.details.checks as Record<string, boolean> } : {}) };
          return { status: 'unreachable' };
        }
      },
      instance: () => transport.request<InstanceStatus>('/instance'),
    },
  };
}
