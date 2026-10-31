import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '.');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
const imports = (path: string) => [...readFileSync(path, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');

/** The UI reaches the backend only through the ports (src/api/ports.ts); only main.tsx composes the HTTP adapter. */
describe('architecture', () => {
  it('ui and domain never import the HTTP adapter', () => {
    const offenders = [...files(join(root, 'ui')), ...files(join(root, 'domain'))].filter((f) => imports(f).some((i) => i.includes('/http/')));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });

  it('domain is pure: no React, no ui, no adapters', () => {
    const offenders = files(join(root, 'domain')).filter((f) => imports(f).some((i) => i === 'react' || i.includes('/ui/') || i.includes('/http/')));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });

  it('only src/api/http calls fetch', () => {
    const offenders = files(root).filter((f) => !f.includes(`${join('api', 'http')}`) && /\bfetch\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });
});
