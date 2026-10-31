import { useState, type ReactNode } from 'react';

import { useAction } from '../hooks';
import { ErrorMessage } from './ErrorMessage';

/**
 * A button that opens a small form with a note (and optional extra fields) before confirming. Used for every audited
 * action that carries the operator's reason.
 */
export function NoteAction({
  label,
  confirmLabel = 'Confirmar',
  noteLabel = 'Nota',
  noteRequired = true,
  extra,
  canConfirm = true,
  onConfirm,
}: {
  label: string;
  confirmLabel?: string;
  noteLabel?: string;
  noteRequired?: boolean;
  extra?: ReactNode;
  canConfirm?: boolean;
  onConfirm: (note: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const action = useAction(onConfirm);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form
      className="note-action"
      aria-label={label}
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await action.run(note.trim());
        if (result !== undefined) {
          setOpen(false);
          setNote('');
        }
      }}
    >
      <label>
        {noteLabel}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} required={noteRequired} rows={2} />
      </label>
      {extra}
      <div className="row">
        <button type="submit" disabled={action.running || !canConfirm || (noteRequired && note.trim() === '')}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
      <ErrorMessage error={action.error} />
    </form>
  );
}
