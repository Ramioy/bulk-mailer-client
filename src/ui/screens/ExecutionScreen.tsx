import { useEffect, useState } from 'react';

import { ApiError } from '../../api/errors';
import type { ExecutionStatus } from '../../api/types';
import { batchStateLabel, errorTypeLabel, receiptStateLabel, stopReasonLabel } from '../../domain/labels';
import { applyProgress, initialProgress, type ProgressView } from '../../domain/progress';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatDate } from '../components/format';
import { NoteAction } from '../components/NoteAction';
import { useLoad } from '../hooks';
import { hrefOf } from '../router';

export function ExecutionScreen({ executionId }: { executionId: string }) {
  const api = useApi();
  const status = useLoad(() => api.executions.get(executionId), [api, executionId]);
  if (status.error) return <ErrorMessage error={status.error} />;
  if (!status.data) return <p>Cargando ejecución…</p>;
  return <ExecutionView key={`${status.data.lastEventSeq}-${status.data.finishedAt ?? ''}`} loaded={status.data} reload={status.reload} />;
}

function ExecutionView({ loaded, reload }: { loaded: ExecutionStatus; reload: () => Promise<void> }) {
  const api = useApi();
  const executionId = loaded.executionId;
  const [progress, setProgress] = useState<ProgressView>(() => initialProgress(loaded));
  const [connection, setConnection] = useState<string>();
  const [force, setForce] = useState(false);
  const [abortInfo, setAbortInfo] = useState<string>();

  useEffect(() => {
    if (loaded.finishedAt) return undefined;
    // D10/D11: resume the live progress from the last event the status already counted.
    const subscription = api.executions.follow(executionId, loaded.lastEventSeq, {
      onEvent: (stored) => setProgress((view) => applyProgress(view, stored)),
      onConnectionProblem: setConnection,
    });
    return () => subscription.close();
  }, [api, executionId, loaded]);

  const { counters } = progress;
  const percent = counters.total > 0 ? Math.round((counters.processed / counters.total) * 100) : 0;

  return (
    <main>
      <h2>Ejecución</h2>
      <p>
        Lote{' '}
        <a href={hrefOf({ name: 'batch', period: loaded.period, block: loaded.block })}>
          {loaded.period} / {loaded.block}
        </a>{' '}
        · manifiesto v{loaded.manifestVersion} · iniciada por {loaded.startedBy} el {formatDate(loaded.startedAt)}
        {loaded.copyAddress ? ` · copia a ${loaded.copyAddress}` : ''}
      </p>
      <p data-testid="execution-state" role="status">
        {progress.finished ? `Terminada: ${batchStateLabel(progress.batchState)}${progress.stopReason ? ` (${stopReasonLabel(progress.stopReason)})` : ''}` : 'En curso'}
      </p>
      <div className="progress" aria-label="Progreso">
        <progress max={Math.max(counters.total, 1)} value={counters.processed} />
        <span data-testid="execution-progress">
          {counters.processed} de {counters.total} ({percent} %)
        </span>
      </div>
      {connection ? <p className="warning">Conexión en vivo interrumpida, reintentando… ({connection})</p> : null}
      {progress.waiting ? (
        <p className="warning" data-testid="execution-waiting">
          En pausa: {progress.waiting.reason} · espera de {progress.waiting.seconds} s · incidentes seguidos: {progress.waiting.consecutiveIncidents} · próximo envío:{' '}
          {formatDate(progress.waiting.nextSendAt)}
        </p>
      ) : null}

      <div className="row counters">
        <section aria-label="Por estado">
          <h3>Por estado de envío</h3>
          <ul>
            {Object.entries(counters.byState).map(([state, n]) => (
              <li key={state}>
                {receiptStateLabel(state)}: <strong>{n}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Por tipo de error">
          <h3>Por tipo de error</h3>
          {Object.keys(counters.byErrorType).length === 0 ? (
            <p className="muted">Sin errores.</p>
          ) : (
            <ul>
              {Object.entries(counters.byErrorType).map(([type, n]) => (
                <li key={type}>
                  {errorTypeLabel(type)}: <strong>{n}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {!progress.finished ? (
        <section aria-label="Detener ejecución">
          <h3>Detener</h3>
          <p className="muted">Solo para una ejecución que dejó de avanzar. Los envíos en curso quedan inciertos y se concilian.</p>
          <NoteAction
            label="Detener ejecución"
            noteLabel="Motivo"
            extra={
              <label className="inline">
                <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Forzar aunque siga avanzando
              </label>
            }
            onConfirm={async (note) => {
              try {
                const result = await api.executions.abort(executionId, note, force);
                setAbortInfo(`Detenida. Envíos inciertos: ${result.uncertain}.`);
                await reload();
                return result;
              } catch (error) {
                if (error instanceof ApiError && error.code === 'EXECUTION_STILL_ACTIVE') {
                  setAbortInfo(`Sigue avanzando (última actividad ${formatDate(String(error.details.lastActivityAt))}); se podrá detener desde ${formatDate(String(error.details.abortableAt))}, o forzando.`);
                }
                throw error;
              }
            }}
          />
          {abortInfo ? <p role="status">{abortInfo}</p> : null}
        </section>
      ) : null}

      <section aria-label="Eventos">
        <h3>Eventos en vivo</h3>
        <ol className="log" data-testid="execution-log">
          {progress.log.map(({ seq, event }) => (
            <li key={seq}>
              #{seq} {event.type === 'RECEIPT_PROCESSED' ? `${event.fileName}: ${receiptStateLabel(event.state)}${event.errorType ? ` (${errorTypeLabel(event.errorType)})` : ''}` : event.type}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
