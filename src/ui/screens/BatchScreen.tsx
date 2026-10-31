import { useRef, useState } from 'react';

import { ApiError } from '../../api/errors';
import { BLOCKS, type Block, type ManifestDifference, type UploadSummary } from '../../api/types';
import { batchStateLabel, errorTypeLabel, receiptStateLabel, stopReasonLabel, uploadOutcomeLabel } from '../../domain/labels';
import { operablePeriods, periodLabel } from '../../domain/periods';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { NoteAction } from '../components/NoteAction';
import { ReceiptTable } from '../components/ReceiptTable';
import { useAction, useLoad } from '../hooks';
import { navigate } from '../router';

const isBlock = (value: string | undefined): value is Block => (BLOCKS as readonly string[]).includes(value ?? '');

const differenceLabel: Record<ManifestDifference['type'], string> = {
  ADDED: 'Agregado',
  REMOVED: 'Quitado',
  RENAMED: 'Renombrado',
  RECIPIENT_CHANGED: 'Destinatario cambiado',
};

export function BatchScreen({ initialPeriod, initialBlock }: { initialPeriod?: string; initialBlock?: string }) {
  const api = useApi();
  const [periods] = useState(() => operablePeriods(new Date()));
  const [period, setPeriod] = useState(initialPeriod && periods.includes(initialPeriod) ? initialPeriod : periods[0]);
  const [block, setBlock] = useState<Block>(isBlock(initialBlock) ? initialBlock : 'CASH');
  const summary = useLoad(() => api.batches.summary(period, block), [api, period, block]);
  const [uploadResult, setUploadResult] = useState<UploadSummary>();
  const [differences, setDifferences] = useState<readonly ManifestDifference[]>();
  const fileInput = useRef<HTMLInputElement>(null);

  const select = (p: string, b: Block) => {
    setPeriod(p);
    setBlock(b);
    setUploadResult(undefined);
    setDifferences(undefined);
    window.history.replaceState(null, '', `#/lotes?periodo=${p}&bloque=${b}`);
  };

  const upload = useAction(async (files: File[]) => {
    const result = await api.batches.upload(period, block, files);
    setUploadResult(result);
    setDifferences(undefined);
    if (fileInput.current) fileInput.current.value = '';
    await summary.reload();
    return result;
  });
  const refresh = useAction(async () => {
    const result = await api.batches.refreshRecipients(period, block);
    setDifferences(undefined);
    await summary.reload();
    return result;
  });
  const send = useAction(async (manifestVersion: number) => {
    try {
      const { executionId } = await api.executions.start(period, block, manifestVersion);
      navigate({ name: 'execution', executionId });
      return executionId;
    } catch (error) {
      // §8.3: show the differences and disable Send until the batch is reviewed again.
      if (error instanceof ApiError && error.code === 'MANIFEST_CHANGED') setDifferences((error.details.differences as ManifestDifference[] | undefined) ?? []);
      throw error;
    }
  });

  const data = summary.data;
  const reviewAgain = async () => {
    setDifferences(undefined);
    await summary.reload();
  };

  return (
    <main>
      <h2>Lote</h2>
      <div className="row selection">
        <label>
          Periodo
          <select value={period} onChange={(e) => select(e.target.value, block)}>
            {periods.map((p, i) => (
              <option key={p} value={p}>
                {periodLabel(p)} ({i === 0 ? 'actual' : 'anterior'})
              </option>
            ))}
          </select>
        </label>
        <label>
          Bloque
          <select value={block} onChange={(e) => select(period, e.target.value as Block)}>
            {BLOCKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void summary.reload()} disabled={summary.loading}>
          Actualizar
        </button>
      </div>

      <ErrorMessage error={summary.error} />

      {data ? (
        <>
          <section className="batch-header" aria-label="Estado del lote">
            <p>
              Estado: <strong data-testid="batch-state">{data.state ? batchStateLabel(data.state) : 'Sin cargas'}</strong>
              {data.stopReason ? ` · motivo: ${stopReasonLabel(data.stopReason)}` : ''} · Versión del manifiesto:{' '}
              <strong data-testid="manifest-version">{data.manifestVersion}</strong> · Copia de archivo: {data.archiveCopyEnabled ? 'activada' : 'desactivada'}
            </p>
          </section>

          <section aria-label="Cargar soportes">
            <h3>Cargar soportes</h3>
            <form
              className="row"
              onSubmit={(event) => {
                event.preventDefault();
                const files = Array.from(fileInput.current?.files ?? []);
                if (files.length > 0) void upload.run(files);
              }}
            >
              <label>
                Archivos PDF
                <input ref={fileInput} type="file" name="files" accept=".pdf,application/pdf" multiple />
              </label>
              <button type="submit" disabled={upload.running || data.state === 'RUNNING'}>
                {upload.running ? 'Cargando…' : 'Cargar'}
              </button>
            </form>
            <ErrorMessage error={upload.error} />
            {uploadResult ? (
              <table data-testid="upload-results">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Resultado</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.results.map((r, i) => (
                    <tr key={`${r.fileName}-${i}`}>
                      <td className="file-name">{r.fileName}</td>
                      <td>{uploadOutcomeLabel(r.outcome)}</td>
                      <td>{receiptStateLabel(r.state)}</td>
                      <td>
                        {r.errorType ? errorTypeLabel(r.errorType) : ''}
                        {r.duplicateOf ? ` Ya registrado en ${r.duplicateOf.period}/${r.duplicateOf.block} (${receiptStateLabel(r.duplicateOf.state)}).` : ''}
                        {r.conflictWith ? ` Mismo contenido que «${r.conflictWith.fileName}»: elige el nombre correcto en «Requieren corrección».` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>

          <section aria-label="Acciones del lote" className="row">
            <button type="button" onClick={() => void refresh.run()} disabled={refresh.running || data.state === 'RUNNING'}>
              Sincronizar destinatarios
            </button>
            <button
              type="button"
              onClick={() => void send.run(data.manifestVersion)}
              disabled={send.running || differences !== undefined || data.readyToSend.length === 0 || data.state === 'RUNNING'}
            >
              Enviar (versión {data.manifestVersion}, {data.readyToSend.length} soportes)
            </button>
            {data.state === 'RUNNING' ? (
              <button type="button" onClick={() => void api.executions.current().then((c) => c && navigate({ name: 'execution', executionId: c.executionId }))}>
                Ver ejecución en curso
              </button>
            ) : null}
            <NoteAction
              label="Liberar archivos"
              noteLabel="Motivo de la liberación"
              onConfirm={async (note) => {
                const result = await api.batches.releaseFiles(period, block, note);
                await summary.reload();
                return result;
              }}
            />
          </section>
          <ErrorMessage error={refresh.error ?? send.error} />

          {differences ? (
            <section className="differences" aria-label="Diferencias del manifiesto" role="status">
              <p>El lote cambió desde la versión revisada. Revisa las diferencias y vuelve a cargar el resumen antes de enviar.</p>
              <ul>
                {differences.map((d) => (
                  <li key={`${d.type}-${d.sha256}`}>
                    {differenceLabel[d.type] ?? d.type}: {d.fileName}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => void reviewAgain()}>
                Revisar de nuevo
              </button>
            </section>
          ) : null}

          <ReceiptTable title="Listos para enviar" testId="ready-to-send" receipts={data.readyToSend} onChanged={() => void summary.reload()} />
          <ReceiptTable title="Requieren corrección" testId="needs-correction" receipts={data.needsCorrection} onChanged={() => void summary.reload()} />
          <ReceiptTable title="Enviando" testId="sending" receipts={data.sending} onChanged={() => void summary.reload()} />
          <ReceiptTable title="Enviados" testId="sent" receipts={data.sent} onChanged={() => void summary.reload()} />
          <ReceiptTable title="Inciertos" testId="uncertain" receipts={data.uncertain} onChanged={() => void summary.reload()} />
          {data.removed.length > 0 ? <ReceiptTable title="Retirados" testId="removed" receipts={data.removed} onChanged={() => void summary.reload()} /> : null}
        </>
      ) : null}
    </main>
  );
}
