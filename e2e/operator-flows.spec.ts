import { expect, test } from '@playwright/test';

import { openBatch, receiptName, signIn, uniquePdf, upload } from './support';

test('sign-in refuses a wrong password and accepts the operator', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario').fill('operador.e2e');
  await page.getByLabel('Contraseña').fill('wrong-password');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert')).toContainText('Usuario o contraseña incorrectos');

  await signIn(page);
  await expect(page.getByText('operador.e2e')).toBeVisible();
  await expect(page.getByTestId('server-status')).toContainText('Servidor en línea');
  await expect(page.getByTestId('server-status')).toContainText('instancia principal');

  // The session survives a reload (refresh token in the tab's storage).
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});

test('upload sorts receipts into ready to send and needs correction', async ({ page }) => {
  await signIn(page);
  await openBatch(page, 'AVVILLAS');
  const valid = receiptName('98765');
  const inactive = receiptName('55555');
  const badName = 'Conjunto sin abreviaturas 98765.pdf';
  await upload(page, [
    { name: valid, buffer: uniquePdf() },
    { name: inactive, buffer: uniquePdf() },
    { name: badName, buffer: uniquePdf() },
  ]);

  const ready = page.getByTestId('ready-to-send');
  await expect(ready.getByRole('row', { name: valid })).toContainText('Conjunto Las Palmas');
  const needsCorrection = page.getByTestId('needs-correction');
  await expect(needsCorrection.getByRole('row', { name: inactive })).toContainText('Contrato inactivo');
  await expect(needsCorrection.getByRole('row', { name: badName })).toContainText('Nombre inválido');

  // Removing a receipt takes it out of the batch.
  await needsCorrection.getByRole('row', { name: badName }).getByRole('button', { name: 'Retirar' }).click();
  await expect(needsCorrection.getByRole('row', { name: badName })).toHaveCount(0);
});

test('same content under two names is a duplicate conflict the operator resolves', async ({ page }) => {
  await signIn(page);
  await openBatch(page, 'DAVIVIENDA');
  const content = uniquePdf();
  const first = receiptName('98765', 'Conjunto Conflicto uno');
  const second = receiptName('104522', 'Conjunto Conflicto dos');
  await upload(page, [{ name: first, buffer: content }]);
  await upload(page, [{ name: second, buffer: content }]);
  await expect(page.getByTestId('upload-results')).toContainText('Conflicto de duplicado');

  const row = page.getByTestId('needs-correction').getByRole('row').filter({ hasText: 'Conflicto de duplicado' });
  await row.getByRole('button', { name: 'Resolver conflicto' }).click();
  await row.getByLabel(second).check();
  await row.getByLabel('Motivo').fill('El contrato correcto es 104522');
  await row.getByRole('button', { name: 'Confirmar' }).click();

  await expect(page.getByTestId('ready-to-send').getByRole('row', { name: second })).toContainText('Edificio Altos');
});

test('send: the execution runs with live progress over SSE and completes', async ({ page }) => {
  await signIn(page);
  await openBatch(page, 'CASH');
  const names = [receiptName('98765'), receiptName('104522'), receiptName('98765')];
  await upload(
    page,
    names.map((name) => ({ name, buffer: uniquePdf() })),
  );
  const version = await page.getByTestId('manifest-version').innerText();
  await page.getByRole('button', { name: new RegExp(`^Enviar \\(versión ${version},`) }).click();

  await expect(page).toHaveURL(/#\/ejecuciones\//);
  // The screen opened while it ran: the progress arrives over SSE (fetch + Bearer through the proxy).
  await expect(page.getByTestId('execution-state')).toContainText('En curso');
  await expect(page.getByTestId('execution-state')).toContainText('Terminada: Completado');
  await expect(page.getByTestId('execution-progress')).toContainText('3 de 3');
  const log = page.getByTestId('execution-log');
  await expect(log).toContainText('FINISHED');
  await expect(log).toContainText(`${names[2]}: Enviado`);

  await page.getByRole('link', { name: /CASH/ }).click();
  for (const name of names) await expect(page.getByTestId('sent').getByRole('row', { name })).toContainText('Enviado');
  await expect(page.getByTestId('ready-to-send')).toContainText('Ninguno.');
});

test('abort: the operator stops a running execution, then acknowledges the alert', async ({ page }) => {
  await signIn(page);
  await openBatch(page, 'OTHERS');
  const names = Array.from({ length: 6 }, () => receiptName('104522'));
  await upload(
    page,
    names.map((name) => ({ name, buffer: uniquePdf() })),
  );
  await page.getByRole('button', { name: /^Enviar \(versión/ }).click();
  await expect(page.getByTestId('execution-state')).toContainText('En curso');

  await page.getByRole('button', { name: 'Detener ejecución' }).click();
  const form = page.getByRole('form', { name: 'Detener ejecución' });
  await form.getByLabel('Motivo').fill('Prueba e2e de detención');
  await form.getByLabel('Forzar aunque siga avanzando').check();
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByTestId('execution-state')).toContainText('Terminada: Detenido (Interrumpido)');

  // The stop raised a "batch stopped" alert: the operator acknowledges it and it leaves the default view.
  await page.getByRole('link', { name: 'Alertas' }).click();
  const alert = page.getByTestId('alerts-table').getByRole('row').filter({ hasText: 'Lote detenido' });
  await expect(alert).toHaveCount(1);
  await alert.getByRole('button', { name: 'Reconocer' }).click();
  await alert.getByLabel('Nota').fill('Detención de prueba');
  await alert.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByTestId('alerts-table').getByRole('row').filter({ hasText: 'Lote detenido' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Historial' }).click();
  await expect(page.getByTestId('alerts-table').getByRole('row').filter({ hasText: 'Lote detenido' })).toContainText('por operador.e2e');
});

test('alerts page loads with the default view (to deal with) and its filters', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Alertas' }).click();
  await expect(page.getByRole('tab', { name: 'Por atender' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('alerts-table').or(page.getByTestId('alerts-empty'))).toBeVisible();
  await page.getByRole('tab', { name: 'Historial' }).click();
  await expect(page.getByTestId('alerts-table').or(page.getByTestId('alerts-empty'))).toBeVisible();
  await page.getByLabel('Tipo').selectOption('HARD_BOUNCE');
  await expect(page.getByTestId('alerts-table').or(page.getByTestId('alerts-empty'))).toBeVisible();
});

test('settings: create a concept, change its subject and retire it', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Ajustes' }).click();
  const key = `E2E ${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const form = page.getByRole('form', { name: 'Nuevo concepto' });
  await form.getByLabel('Clave').fill(key);
  await form.getByLabel('Asunto').fill('Concepto de prueba');
  await form.getByRole('button', { name: 'Agregar concepto' }).click();

  const row = page.getByTestId('concepts-table').getByRole('row', { name: key });
  await expect(row).toContainText('Activo');
  await row.getByLabel(`Asunto de ${key}`).fill('Concepto de prueba editado');
  await row.getByRole('button', { name: 'Guardar asunto' }).click();
  await expect(row.getByLabel(`Asunto de ${key}`)).toHaveValue('Concepto de prueba editado');
  await row.getByRole('button', { name: 'Retirar' }).click();
  await expect(row).toContainText('Retirado');

  // Without ARCHIVE_COPY_ADDRESS on the server, the copy cannot be enabled.
  await expect(page.getByText('El servidor no tiene dirección de copia configurada')).toBeVisible();
});

test('suppressions page loads', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Supresiones' }).click();
  await expect(page.getByRole('heading', { name: 'Direcciones suprimidas' })).toBeVisible();
});
