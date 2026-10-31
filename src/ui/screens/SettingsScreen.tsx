import { useState } from 'react';

import type { Concept } from '../../api/types';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAction, useLoad } from '../hooks';

function ConceptRow({ concept, onChanged }: { concept: Concept; onChanged: () => Promise<void> }) {
  const api = useApi();
  const [subject, setSubject] = useState(concept.subject);
  const update = useAction(async (change: { subject?: string; active?: boolean }) => {
    const result = await api.admin.updateConcept(concept.key, change);
    await onChanged();
    return result;
  });
  return (
    <tr>
      <td>{concept.key}</td>
      <td>
        <input aria-label={`Asunto de ${concept.key}`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <button type="button" disabled={update.running || subject.trim() === concept.subject} onClick={() => void update.run({ subject: subject.trim() })}>
          Guardar asunto
        </button>
      </td>
      <td>{concept.active ? 'Activo' : 'Retirado'}</td>
      <td>
        <button type="button" disabled={update.running} onClick={() => void update.run({ active: !concept.active })}>
          {concept.active ? 'Retirar' : 'Reactivar'}
        </button>
        <ErrorMessage error={update.error} />
      </td>
    </tr>
  );
}

export function SettingsScreen() {
  const api = useApi();
  const concepts = useLoad(() => api.admin.concepts(), [api]);
  const archive = useLoad(() => api.admin.archiveCopy(), [api]);
  const [key, setKey] = useState('');
  const [subject, setSubject] = useState('');
  const add = useAction(async () => {
    const result = await api.admin.addConcept(key.trim(), subject.trim());
    setKey('');
    setSubject('');
    await concepts.reload();
    return result;
  });
  const toggle = useAction(async (enabled: boolean) => {
    const result = await api.admin.setArchiveCopy(enabled);
    await archive.reload();
    return result;
  });

  return (
    <main>
      <h2>Ajustes</h2>
      <section aria-label="Catálogo de conceptos">
        <h3>Catálogo de conceptos</h3>
        <p className="muted">La clave es el texto exacto que va después de CNCPT en el nombre del archivo; el asunto aparece en el correo. Los cambios quedan auditados.</p>
        <ErrorMessage error={concepts.error} />
        <table data-testid="concepts-table">
          <thead>
            <tr>
              <th>Clave</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {(concepts.data ?? []).map((c) => (
              <ConceptRow key={`${c.key}-${c.subject}-${c.active}`} concept={c} onChanged={concepts.reload} />
            ))}
          </tbody>
        </table>
        <form
          className="row"
          aria-label="Nuevo concepto"
          onSubmit={(event) => {
            event.preventDefault();
            void add.run();
          }}
        >
          <label>
            Clave
            <input value={key} onChange={(e) => setKey(e.target.value)} required />
          </label>
          <label>
            Asunto
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <button type="submit" disabled={add.running}>
            Agregar concepto
          </button>
        </form>
        <ErrorMessage error={add.error} />
      </section>

      <section aria-label="Copia de archivo">
        <h3>Copia de archivo</h3>
        <ErrorMessage error={archive.error} />
        {archive.data ? (
          <>
            <p>
              {archive.data.address ? `Dirección configurada en el servidor: ${archive.data.address}.` : 'El servidor no tiene dirección de copia configurada (ARCHIVE_COPY_ADDRESS).'} Aplica desde la próxima
              ejecución.
            </p>
            <label className="inline">
              <input
                type="checkbox"
                checked={archive.data.enabled}
                disabled={toggle.running || (!archive.data.address && !archive.data.enabled)}
                onChange={(e) => void toggle.run(e.target.checked)}
              />{' '}
              Enviar copia oculta (bcc) de cada correo
            </label>
            <ErrorMessage error={toggle.error} />
          </>
        ) : null}
      </section>
    </main>
  );
}
