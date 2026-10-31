// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/errors';
import type { BulkMailerApi } from '../../api/ports';
import type { BatchSummary } from '../../api/types';
import { ApiProvider } from '../api-context';
import { fakeApi } from '../test-fakes';
import { BatchScreen } from './BatchScreen';
import { SignInScreen } from './SignInScreen';

afterEach(cleanup);

const summary = (version: number): BatchSummary => ({
  period: '2026-10',
  block: 'CASH',
  state: 'OPEN',
  manifestVersion: version,
  archiveCopyEnabled: false,
  readyToSend: [{ sha256: 'a'.repeat(64), fileName: 'X CNCPT MULTA CNTRT 1.pdf', state: 'PENDING', fileAvailable: true, attempts: 0, contract: '1' }],
  needsCorrection: [{ sha256: 'b'.repeat(64), fileName: 'Y CNCPT MULTA CNTRT 2.pdf', state: 'FAILED', errorType: 'PROVIDER_REJECTED', fileError: 'FILE_NOT_AVAILABLE', fileAvailable: false, attempts: 1 }],
  sending: [],
  sent: [],
  uncertain: [],
  removed: [],
});

describe('SignInScreen', () => {
  it('shows the refusal in Spanish', async () => {
    const api = fakeApi({ auth: { signIn: () => Promise.reject(new ApiError(401, 'WRONG_PASSWORD')) } });
    render(
      <ApiProvider api={api}>
        <SignInScreen onSignedIn={() => undefined} />
      </ApiProvider>,
    );
    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'op' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Usuario o contraseña incorrectos (WRONG_PASSWORD)');
  });
});

describe('BatchScreen', () => {
  it('sends with the reviewed manifest version; on MANIFEST_CHANGED shows the differences and disables Send until reviewed again', async () => {
    let version = 3;
    const start = vi.fn<BulkMailerApi['executions']['start']>(() => Promise.reject(new ApiError(409, 'MANIFEST_CHANGED', { currentVersion: 4, differences: [{ type: 'ADDED', sha256: 'c'.repeat(64), fileName: 'Z CNCPT MULTA CNTRT 3.pdf' }] })));
    const api = fakeApi({ batches: { summary: () => Promise.resolve(summary(version)) }, executions: { start } });
    render(
      <ApiProvider api={api}>
        <BatchScreen initialBlock="CASH" />
      </ApiProvider>,
    );
    // The receipt without its file says so apart from its error type (D42).
    expect(await screen.findByText('Archivo no disponible: vuelve a cargar el archivo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Enviar \(versión 3, 1 soportes\)/ }));
    await waitFor(() => expect(start).toHaveBeenCalledWith(expect.any(String), 'CASH', 3));
    expect(await screen.findByText('Agregado: Z CNCPT MULTA CNTRT 3.pdf')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Enviar/ })).toHaveProperty('disabled', true);

    version = 4;
    fireEvent.click(screen.getByRole('button', { name: 'Revisar de nuevo' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Enviar \(versión 4/ })).toHaveProperty('disabled', false));
  });
});
