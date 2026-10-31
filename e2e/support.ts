import { expect, type Page } from '@playwright/test';

import { E2E_OPERATOR } from './operator.mjs';

/** A minimal PDF the backend accepts (header, one object, trailer, %%EOF), unique per call so it is never a duplicate. */
export function uniquePdf(): Buffer {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Buffer.from(`%PDF-1.7\n% e2e ${nonce}\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, 'latin1');
}

/** A valid receipt name (§4): `<detail> CNCPT <concept> CNTRT <contract>.pdf`. Contracts from deploy/dev/fake-contracts.json. */
export function receiptName(contract: string, detail = `Conjunto E2E ${Math.random().toString(36).slice(2, 7)}`, concept = 'PAGO ADMINISTRACIÓN'): string {
  return `${detail} CNCPT ${concept} CNTRT ${contract}.pdf`;
}

export async function signIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(E2E_OPERATOR.username);
  await page.getByLabel('Contraseña').fill(E2E_OPERATOR.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
}

export async function openBatch(page: Page, block: string): Promise<void> {
  await page.getByRole('link', { name: 'Lotes' }).click();
  await page.getByLabel('Bloque').selectOption(block);
  await expect(page.getByTestId('manifest-version')).toBeVisible();
}

export async function upload(page: Page, files: ReadonlyArray<{ name: string; buffer: Buffer }>): Promise<void> {
  await page.getByLabel('Archivos PDF').setInputFiles(files.map((f) => ({ name: f.name, mimeType: 'application/pdf', buffer: f.buffer })));
  await page.getByRole('button', { name: 'Cargar', exact: true }).click();
  await expect(page.getByTestId('upload-results')).toBeVisible();
}
