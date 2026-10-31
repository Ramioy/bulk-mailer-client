/**
 * Ports of the web client: the UI talks to the backend only through these interfaces. The HTTP adapter
 * (src/api/http) implements them; tests use in-memory fakes. Every operation refuses with ApiError (typed backend
 * code), NetworkError or SessionExpiredError.
 */
import type {
  AbortResult,
  Alert,
  AlertQuery,
  ArchiveCopySetting,
  BatchSummary,
  Block,
  Concept,
  ExecutionStatus,
  Health,
  InstanceStatus,
  Operator,
  RefreshResult,
  ReleaseRequest,
  StoredProgressEvent,
  SuppressionList,
  UploadSummary,
} from './types';

export interface AuthApi {
  /** Restores a stored session, if any (renewing it when needed). */
  restore(): Promise<Operator | undefined>;
  signIn(username: string, password: string): Promise<Operator>;
  signOut(): Promise<void>;
  /** Called when the session ends by itself (refresh refused). */
  onSessionEnded(listener: () => void): () => void;
}

export interface BatchesApi {
  summary(period: string, block: Block): Promise<BatchSummary>;
  /** Multipart field `files`; 413 UPLOAD_TOO_LARGE over the upload budget (D48). */
  upload(period: string, block: Block, files: readonly File[]): Promise<UploadSummary>;
  refreshRecipients(period: string, block: Block): Promise<RefreshResult>;
  /** D51: releases the batch's files; the records stay. */
  releaseFiles(period: string, block: Block, note: string): Promise<{ released: number; manifestVersion: number }>;
  removeReceipt(sha256: string): Promise<unknown>;
  /** D31: keep the receipt under one of the names in conflict. */
  resolveConflict(sha256: string, fileName: string, note: string): Promise<unknown>;
  resolveUncertain(sha256: string, outcome: 'SENT' | 'NOT_SENT', note: string): Promise<unknown>;
  resend(sha256: string): Promise<unknown>;
  verifyDelivery(sha256: string): Promise<unknown>;
}

export interface ProgressSubscription {
  close(): void;
}

export interface ProgressHandlers {
  onEvent(event: StoredProgressEvent): void;
  /** The connection is down and will be retried; `undefined` once it is up again. */
  onConnectionProblem?(problem: string | undefined): void;
  onClosed?(): void;
}

export interface ExecutionsApi {
  /** `409 MANIFEST_CHANGED` with `differences` when the batch changed since the reviewed version. */
  start(period: string, block: Block, manifestVersion: number): Promise<{ executionId: string }>;
  /** The running execution, or the last one; undefined when there was none (D10). */
  current(): Promise<ExecutionStatus | undefined>;
  get(executionId: string): Promise<ExecutionStatus>;
  /** D32 */
  abort(executionId: string, note: string, force: boolean): Promise<AbortResult>;
  /**
   * Live progress over SSE (fetch + Bearer, D12): resumes after `afterSeq` and after every reconnection, renewing the
   * token on TOKEN_EXPIRED; ends after FINISHED.
   */
  follow(executionId: string, afterSeq: number, handlers: ProgressHandlers): ProgressSubscription;
}

export interface AlertsApi {
  list(query: AlertQuery): Promise<readonly Alert[]>;
  acknowledge(alertId: string, note?: string): Promise<Alert>;
}

export interface AdminApi {
  concepts(): Promise<readonly Concept[]>;
  addConcept(key: string, subject: string): Promise<Concept>;
  updateConcept(key: string, change: { subject?: string; active?: boolean }): Promise<Concept>;
  archiveCopy(): Promise<ArchiveCopySetting>;
  setArchiveCopy(enabled: boolean): Promise<ArchiveCopySetting>;
}

export interface SuppressionsApi {
  list(): Promise<SuppressionList>;
  release(email: string, request: ReleaseRequest): Promise<unknown>;
}

export interface SystemApi {
  /** Public `/health`; never throws. */
  health(): Promise<Health>;
  /** D47 */
  instance(): Promise<InstanceStatus>;
}

export interface BulkMailerApi {
  readonly auth: AuthApi;
  readonly batches: BatchesApi;
  readonly executions: ExecutionsApi;
  readonly alerts: AlertsApi;
  readonly admin: AdminApi;
  readonly suppressions: SuppressionsApi;
  readonly system: SystemApi;
}
