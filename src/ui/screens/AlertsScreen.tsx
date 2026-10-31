import { useState } from 'react';

import type { AlertQuery } from '../../api/types';
import { ALERT_TYPES, alertTypeLabel } from '../../domain/labels';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatDate } from '../components/format';
import { NoteAction } from '../components/NoteAction';
import { useLoad } from '../hooks';

type View = 'toDealWith' | 'resolvedToReview' | 'history';

/** D46/D52: by default the alerts to deal with (`pending=true&resolved=false`). */
const VIEWS: Record<View, { label: string; query: AlertQuery }> = {
  toDealWith: { label: 'Por atender', query: { pending: true, resolved: false } },
  resolvedToReview: { label: 'Resueltas, por reconocer', query: { pending: true, resolved: true } },
  history: { label: 'Historial', query: {} },
};

export function AlertsScreen() {
  const api = useApi();
  const [view, setView] = useState<View>('toDealWith');
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const query: AlertQuery = { ...VIEWS[view].query, ...(type ? { type } : {}), ...(subject.trim() ? { subject: subject.trim() } : {}) };
  const alerts = useLoad(() => api.alerts.list(query), [api, view, type, subject]);

  return (
    <main>
      <h2>Alertas</h2>
      <div className="row" role="tablist">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
            {VIEWS[v].label}
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {ALERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {alertTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sujeto
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="hash, ejecución, correo…" />
        </label>
        <button type="button" onClick={() => void alerts.reload()}>
          Actualizar
        </button>
      </div>
      <ErrorMessage error={alerts.error} />
      {alerts.data ? (
        alerts.data.length === 0 ? (
          <p className="muted" data-testid="alerts-empty">
            No hay alertas en esta vista.
          </p>
        ) : (
          <table data-testid="alerts-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Sujeto</th>
                <th>Detalle</th>
                <th>Resolución</th>
                <th>Reconocida</th>
              </tr>
            </thead>
            <tbody>
              {alerts.data.map((a) => (
                <tr key={a.alertId}>
                  <td>{formatDate(a.raisedAt)}</td>
                  <td>{alertTypeLabel(a.type)}</td>
                  <td className="file-name">{a.subject}</td>
                  <td>{a.detail}</td>
                  <td>{a.resolvedAt ? `${formatDate(a.resolvedAt)}: ${a.resolution ?? ''}` : ''}</td>
                  <td>
                    {a.acknowledgedAt ? (
                      `${formatDate(a.acknowledgedAt)} por ${a.acknowledgedBy ?? ''}`
                    ) : (
                      <NoteAction
                        label="Reconocer"
                        noteRequired={false}
                        onConfirm={async (note) => {
                          const result = await api.alerts.acknowledge(a.alertId, note || undefined);
                          await alerts.reload();
                          return result;
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}
    </main>
  );
}
