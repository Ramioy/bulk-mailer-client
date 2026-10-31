import { useEffect, useState } from 'react';

export type Route =
  | { readonly name: 'batch'; readonly period?: string; readonly block?: string }
  | { readonly name: 'execution'; readonly executionId: string }
  | { readonly name: 'alerts' }
  | { readonly name: 'suppressions' }
  | { readonly name: 'settings' };

/** Hash routes: `#/lotes?periodo=2026-10&bloque=CASH`, `#/ejecuciones/<id>`, `#/alertas`, `#/supresiones`, `#/ajustes`. */
export function parseRoute(hash: string): Route {
  const [path = '', query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);
  switch (parts[0]) {
    case 'ejecuciones':
      return parts[1] ? { name: 'execution', executionId: decodeURIComponent(parts[1]) } : { name: 'batch' };
    case 'alertas':
      return { name: 'alerts' };
    case 'supresiones':
      return { name: 'suppressions' };
    case 'ajustes':
      return { name: 'settings' };
    default: {
      const period = params.get('periodo') ?? undefined;
      const block = params.get('bloque') ?? undefined;
      return { name: 'batch', ...(period ? { period } : {}), ...(block ? { block } : {}) };
    }
  }
}

export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'execution':
      return `#/ejecuciones/${encodeURIComponent(route.executionId)}`;
    case 'alerts':
      return '#/alertas';
    case 'suppressions':
      return '#/supresiones';
    case 'settings':
      return '#/ajustes';
    case 'batch': {
      const params = new URLSearchParams();
      if (route.period) params.set('periodo', route.period);
      if (route.block) params.set('bloque', route.block);
      const qs = params.toString();
      return `#/lotes${qs ? `?${qs}` : ''}`;
    }
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefOf(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
