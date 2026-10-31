import { useState } from 'react';

import type { ReceiptView } from '../../api/types';
import { useApi } from '../api-context';
import { useAction } from '../hooks';
import { ErrorMessage } from './ErrorMessage';
import { NoteAction } from './NoteAction';

const REMOVABLE = new Set(['PENDING', 'INVALID', 'FAILED']);
const RESENDABLE_DELIVERY = new Set(['HARD_BOUNCE', 'COMPLAINT', 'PROCESS_FAILED']);

/** The actions a receipt offers in its state; the backend still decides (it refuses with a typed code). */
export function ReceiptActions({ receipt, onChanged }: { receipt: ReceiptView; onChanged: () => void }) {
  const api = useApi();
  const after = async <T,>(promise: Promise<T>) => {
    const value = await promise;
    onChanged();
    return value ?? true;
  };
  const remove = useAction(() => after(api.batches.removeReceipt(receipt.sha256)));
  const resend = useAction(() => after(api.batches.resend(receipt.sha256)));
  const verify = useAction(() => after(api.batches.verifyDelivery(receipt.sha256)));
  const [chosenName, setChosenName] = useState(receipt.fileName);
  const [outcome, setOutcome] = useState<'SENT' | 'NOT_SENT'>('SENT');

  const conflict = receipt.conflictingNames && receipt.conflictingNames.length > 0;
  const names = conflict ? [receipt.fileName, ...receipt.conflictingNames!.map((n) => n.fileName).filter((n) => n !== receipt.fileName)] : [];

  return (
    <div className="actions">
      {conflict ? (
        <NoteAction
          label="Resolver conflicto"
          noteLabel="Motivo"
          extra={
            <fieldset>
              <legend>Nombre que se conserva</legend>
              {names.map((name) => (
                <label key={name} className="inline">
                  <input type="radio" name={`chosen-${receipt.sha256}`} checked={chosenName === name} onChange={() => setChosenName(name)} />
                  {name}
                </label>
              ))}
            </fieldset>
          }
          onConfirm={(note) => after(api.batches.resolveConflict(receipt.sha256, chosenName, note))}
        />
      ) : null}
      {receipt.state === 'UNCERTAIN' ? (
        <NoteAction
          label="Resolver incierto"
          noteLabel="Evidencia"
          extra={
            <label>
              Resultado
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as 'SENT' | 'NOT_SENT')}>
                <option value="SENT">Sí se envió</option>
                <option value="NOT_SENT">No se envió</option>
              </select>
            </label>
          }
          onConfirm={(note) => after(api.batches.resolveUncertain(receipt.sha256, outcome, note))}
        />
      ) : null}
      {receipt.state === 'SENT' || receipt.state === 'UNCERTAIN' ? (
        <button type="button" disabled={verify.running} onClick={() => void verify.run()}>
          Verificar entrega
        </button>
      ) : null}
      {receipt.state === 'SENT' && receipt.deliveryState && RESENDABLE_DELIVERY.has(receipt.deliveryState) ? (
        <button type="button" disabled={resend.running} onClick={() => void resend.run()}>
          Reenviar
        </button>
      ) : null}
      {REMOVABLE.has(receipt.state) ? (
        <button type="button" disabled={remove.running} onClick={() => void remove.run()}>
          Retirar
        </button>
      ) : null}
      <ErrorMessage error={remove.error ?? resend.error ?? verify.error} />
    </div>
  );
}
