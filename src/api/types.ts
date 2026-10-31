/**
 * Shapes of the Bulk Mailer backend HTTP API, as its controllers and use-case result types return them
 * (bulk-mailer-backend: src/adapters/inbound/http/**, src/application/**). Dates travel as ISO strings.
 */

export const BLOCKS = ['CASH', 'AVVILLAS', 'BANCOLOMBIA', 'DAVIVIENDA', 'ANGLO', 'OTHERS'] as const;
export type Block = (typeof BLOCKS)[number];

export type BatchState = 'OPEN' | 'RUNNING' | 'COMPLETED' | 'STOPPED';
export type ReceiptState = 'PENDING' | 'INVALID' | 'SENDING' | 'SENT' | 'FAILED' | 'UNCERTAIN' | 'REMOVED';
export type DeliveryState = 'UNCONFIRMED' | 'SOFT_BOUNCE' | 'ACCEPTED' | 'HARD_BOUNCE' | 'COMPLAINT' | 'PROCESS_FAILED';
export type BatchStopReason = 'PROVIDER_ACCOUNT' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_UNKNOWN_ERROR' | 'SOURCE_UNAVAILABLE' | 'INTERNAL_ERROR' | 'INTERRUPTED';
/** File, recipient, send and conflict error types (§11). Kept as string so a new backend type still shows. */
export type ReceiptErrorType = string;

export interface Operator {
  readonly operatorId: string;
  readonly username: string;
}

export interface Session {
  readonly operator: Operator;
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
}

export interface ConflictingName {
  readonly fileName: string;
  readonly period: string;
  readonly block: Block;
  readonly conceptKey: string;
  readonly contract: string;
}

export interface ReceiptView {
  readonly sha256: string;
  readonly fileName: string;
  readonly conceptKey?: string;
  readonly contract?: string;
  readonly complexName?: string;
  readonly email?: string;
  readonly state: ReceiptState;
  readonly errorType?: ReceiptErrorType;
  readonly errorDetail?: string;
  readonly fileAvailable: boolean;
  /** D42: PENDING/FAILED without its file: it must be uploaded again, whatever `errorType` says. */
  readonly fileError?: 'FILE_NOT_AVAILABLE';
  readonly attempts: number;
  readonly deliveryState?: DeliveryState;
  /** D31: other names the same content arrived under. */
  readonly conflictingNames?: readonly ConflictingName[];
}

export interface BatchSummary {
  readonly period: string;
  readonly block: Block;
  readonly state?: BatchState;
  readonly stopReason?: BatchStopReason;
  readonly manifestVersion: number;
  readonly archiveCopyEnabled: boolean;
  readonly readyToSend: readonly ReceiptView[];
  readonly needsCorrection: readonly ReceiptView[];
  readonly sending: readonly ReceiptView[];
  readonly sent: readonly ReceiptView[];
  readonly uncertain: readonly ReceiptView[];
  readonly removed: readonly ReceiptView[];
}

export type UploadOutcome = 'REGISTERED' | 'DUPLICATE' | 'DUPLICATE_CONFLICT' | 'REJECTED';

export interface UploadResult {
  readonly fileName: string;
  readonly outcome: UploadOutcome;
  readonly sha256?: string;
  readonly state?: ReceiptState;
  readonly errorType?: ReceiptErrorType;
  readonly errorDetail?: string;
  readonly duplicateOf?: { readonly period: string; readonly block: Block; readonly state: ReceiptState };
  readonly conflictWith?: { readonly fileName: string; readonly period?: string; readonly block?: Block; readonly state?: ReceiptState };
}

export interface UploadSummary {
  readonly manifestVersion: number;
  readonly results: readonly UploadResult[];
}

export interface RefreshResult {
  readonly manifestVersion: number;
  readonly refreshed: number;
  readonly withoutFile: number;
}

export interface ManifestDifference {
  readonly type: 'ADDED' | 'REMOVED' | 'RENAMED' | 'RECIPIENT_CHANGED';
  readonly sha256: string;
  readonly fileName: string;
  readonly [detail: string]: unknown;
}

export interface ProgressCounters {
  readonly total: number;
  readonly processed: number;
  readonly byState: Readonly<Partial<Record<ReceiptState, number>>>;
  readonly byErrorType: Readonly<Record<string, number>>;
}

export interface ExecutionWaiting {
  readonly reason: string;
  readonly seconds: number;
  readonly consecutiveIncidents: number;
  readonly nextSendAt: string;
}

export interface ExecutionStatus {
  readonly executionId: string;
  readonly period: string;
  readonly block: Block;
  readonly manifestVersion: number;
  readonly startedBy: string;
  readonly startedAt: string;
  readonly copyAddress?: string;
  readonly finishedAt?: string;
  readonly result?: 'COMPLETED' | 'STOPPED';
  readonly stopReason?: BatchStopReason;
  readonly batchState?: BatchState;
  readonly counters: ProgressCounters;
  readonly waiting?: ExecutionWaiting;
  /** Resume the live progress from here (`Last-Event-ID`). */
  readonly lastEventSeq: number;
}

export type ProgressEvent =
  | { readonly type: 'STARTED'; readonly counters: ProgressCounters }
  | {
      readonly type: 'RECEIPT_PROCESSED';
      readonly sha256: string;
      readonly fileName: string;
      readonly state: ReceiptState;
      readonly errorType?: ReceiptErrorType;
      readonly counters: ProgressCounters;
    }
  | ({ readonly type: 'WAITING' } & ExecutionWaiting)
  | { readonly type: 'FINISHED'; readonly batchState: 'COMPLETED' | 'STOPPED'; readonly stopReason?: BatchStopReason; readonly counters: ProgressCounters };

export interface StoredProgressEvent {
  readonly seq: number;
  readonly event: ProgressEvent;
}

export interface AbortResult {
  readonly executionId: string;
  readonly result: 'STOPPED';
  readonly stopReason: 'INTERRUPTED';
  readonly uncertain: number;
}

export interface Alert {
  readonly alertId: string;
  readonly type: string;
  readonly subject: string;
  readonly detail: string;
  readonly raisedAt: string;
  readonly reference?: string;
  readonly acknowledgedAt?: string;
  readonly acknowledgedBy?: string;
  readonly resolvedAt?: string;
  readonly resolution?: string;
}

export interface AlertQuery {
  /** Not acknowledged yet. */
  readonly pending?: boolean;
  /** true: the system saw its cause resolved; false: not resolved; absent: both (D52). */
  readonly resolved?: boolean;
  readonly type?: string;
  readonly subject?: string;
  readonly limit?: number;
}

export interface Concept {
  readonly key: string;
  readonly subject: string;
  readonly active: boolean;
}

export interface ArchiveCopySetting {
  readonly enabled: boolean;
  /** Configured on the server (ARCHIVE_COPY_ADDRESS); null when it is not, and then the copy cannot be enabled. */
  readonly address: string | null;
}

export interface Suppression {
  readonly email: string;
  readonly reason: 'HARD_BOUNCE' | 'COMPLAINT';
  readonly since: string;
  readonly attemptId?: string;
}

export interface SuppressionList {
  /** `OPERATOR`: the operator removes the address in the provider console and confirms it here (D19). */
  readonly release: 'PROVIDER_API' | 'OPERATOR';
  readonly addresses: readonly Suppression[];
}

export interface ReleaseRequest {
  readonly businessConfirmed: boolean;
  readonly removedInProviderConsole: boolean;
  readonly note: string;
}

export interface InstanceStatus {
  readonly instanceId: string;
  readonly role: 'leader' | 'standby';
  readonly leaseHolder?: string;
  readonly leaseExpiresAt?: string;
}

export type Health = { readonly status: 'ok' } | { readonly status: 'degraded'; readonly checks?: Readonly<Record<string, boolean>> } | { readonly status: 'unreachable' };
