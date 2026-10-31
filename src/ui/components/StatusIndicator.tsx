import { useEffect, useState } from 'react';

import type { Health, InstanceStatus } from '../../api/types';
import { useApi } from '../api-context';

const POLL_MS = 30_000;

/** `/health` (public) and `/instance` (D47): whether the server answers and whether this instance runs the work. */
export function StatusIndicator() {
  const api = useApi();
  const [health, setHealth] = useState<Health>();
  const [instance, setInstance] = useState<InstanceStatus>();

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const h = await api.system.health();
      const i = await api.system.instance().catch(() => undefined);
      if (alive) {
        setHealth(h);
        setInstance(i);
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api]);

  const text =
    health === undefined
      ? 'Comprobando servidor…'
      : health.status === 'ok'
        ? 'Servidor en línea'
        : health.status === 'degraded'
          ? `Servidor degradado${'checks' in health && health.checks ? `: ${Object.entries(health.checks).filter(([, ok]) => !ok).map(([name]) => name).join(', ')}` : ''}`
          : 'Servidor no disponible';
  const role = instance ? (instance.role === 'leader' ? 'instancia principal' : 'instancia en espera (no procesa trabajos)') : '';
  return (
    <span className={`status status-${health?.status ?? 'unknown'}`} data-testid="server-status" title={instance ? `Instancia ${instance.instanceId}` : undefined}>
      {text}
      {role ? ` · ${role}` : ''}
    </span>
  );
}
