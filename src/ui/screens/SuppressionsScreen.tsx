import { useState } from 'react';

import type { Suppression } from '../../api/types';
import { deliveryStateLabel } from '../../domain/labels';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatDate } from '../components/format';
import { NoteAction } from '../components/NoteAction';
import { useLoad } from '../hooks';

/** §10.3, D19: releasing a suppressed address needs the business validation and, without a provider API, the console removal. */
function ReleaseAction({ address, needsConsole, onReleased }: { address: Suppression; needsConsole: boolean; onReleased: () => Promise<void> }) {
  const api = useApi();
  const [business, setBusiness] = useState(false);
  const [removedInConsole, setRemovedInConsole] = useState(false);
  return (
    <NoteAction
      label="Liberar"
      noteLabel="Evidencia"
      canConfirm={business && (!needsConsole || removedInConsole)}
      extra={
        <>
          <label className="inline">
            <input type="checkbox" checked={business} onChange={(e) => setBusiness(e.target.checked)} /> El negocio validó la dirección
          </label>
          {needsConsole ? (
            <label className="inline">
              <input type="checkbox" checked={removedInConsole} onChange={(e) => setRemovedInConsole(e.target.checked)} /> Ya la quité en la consola de ZeptoMail
            </label>
          ) : null}
        </>
      }
      onConfirm={async (note) => {
        const result = await api.suppressions.release(address.email, { businessConfirmed: business, removedInProviderConsole: removedInConsole, note });
        await onReleased();
        return result ?? true;
      }}
    />
  );
}

export function SuppressionsScreen() {
  const api = useApi();
  const list = useLoad(() => api.suppressions.list(), [api]);
  return (
    <main>
      <h2>Direcciones suprimidas</h2>
      <ErrorMessage error={list.error} />
      {list.data ? (
        list.data.addresses.length === 0 ? (
          <p className="muted">No hay direcciones suprimidas.</p>
        ) : (
          <table data-testid="suppressions-table">
            <thead>
              <tr>
                <th>Correo</th>
                <th>Motivo</th>
                <th>Desde</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {list.data.addresses.map((a) => (
                <tr key={a.email}>
                  <td>{a.email}</td>
                  <td>{deliveryStateLabel(a.reason)}</td>
                  <td>{formatDate(a.since)}</td>
                  <td>
                    <ReleaseAction address={a} needsConsole={list.data?.release === 'OPERATOR'} onReleased={list.reload} />
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
