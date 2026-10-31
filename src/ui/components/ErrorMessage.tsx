import { ApiError, NetworkError, SessionExpiredError } from '../../api/errors';
import { apiErrorLabel } from '../../domain/labels';

export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    const text = apiErrorLabel(error.code);
    return text === error.code ? `Error ${error.status}: ${error.code}` : `${text} (${error.code})`;
  }
  if (error instanceof NetworkError) return apiErrorLabel('NETWORK_ERROR');
  if (error instanceof SessionExpiredError) return apiErrorLabel('SESSION_EXPIRED');
  return error instanceof Error ? error.message : String(error);
}

export function ErrorMessage({ error }: { error: unknown }) {
  if (error === undefined || error === null) return null;
  return (
    <p role="alert" className="error">
      {describeError(error)}
    </p>
  );
}
