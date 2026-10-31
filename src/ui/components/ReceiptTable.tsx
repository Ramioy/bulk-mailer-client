import type { ReceiptView } from '../../api/types';
import { deliveryStateLabel, errorTypeLabel, receiptStateLabel } from '../../domain/labels';
import { ReceiptActions } from './ReceiptActions';

export function ReceiptTable({ title, receipts, onChanged, testId }: { title: string; receipts: readonly ReceiptView[]; onChanged: () => void; testId: string }) {
  return (
    <section className="receipts" data-testid={testId} aria-label={title}>
      <h3>
        {title} <span className="count">({receipts.length})</span>
      </h3>
      {receipts.length === 0 ? (
        <p className="muted">Ninguno.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>Contrato</th>
              <th>Destinatario</th>
              <th>Estado</th>
              <th>Error</th>
              <th>Entrega</th>
              <th>Intentos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.sha256}>
                <td className="file-name">{r.fileName}</td>
                <td>{r.contract ?? ''}</td>
                <td>
                  {r.complexName ?? ''}
                  {r.email ? <div className="muted">{r.email}</div> : null}
                </td>
                <td>{receiptStateLabel(r.state)}</td>
                <td>
                  {r.errorType ? <span title={r.errorDetail}>{errorTypeLabel(r.errorType)}</span> : null}
                  {r.fileError ? <div className="file-error">{errorTypeLabel(r.fileError)}: vuelve a cargar el archivo</div> : null}
                </td>
                <td>{deliveryStateLabel(r.deliveryState)}</td>
                <td>{r.attempts}</td>
                <td>
                  <ReceiptActions receipt={r} onChanged={onChanged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
