import { useEffect, useState } from 'react';

import type { ExecutionStatus, Operator } from '../api/types';
import { useApi } from './api-context';
import { StatusIndicator } from './components/StatusIndicator';
import { hrefOf, useRoute, type Route } from './router';
import { AlertsScreen } from './screens/AlertsScreen';
import { BatchScreen } from './screens/BatchScreen';
import { ExecutionScreen } from './screens/ExecutionScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SuppressionsScreen } from './screens/SuppressionsScreen';

const NAV: ReadonlyArray<{ route: Route; label: string }> = [
  { route: { name: 'batch' }, label: 'Lotes' },
  { route: { name: 'alerts' }, label: 'Alertas' },
  { route: { name: 'suppressions' }, label: 'Supresiones' },
  { route: { name: 'settings' }, label: 'Ajustes' },
];

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'batch':
      return <BatchScreen key={`${route.period}-${route.block}`} {...(route.period ? { initialPeriod: route.period } : {})} {...(route.block ? { initialBlock: route.block } : {})} />;
    case 'execution':
      return <ExecutionScreen key={route.executionId} executionId={route.executionId} />;
    case 'alerts':
      return <AlertsScreen />;
    case 'suppressions':
      return <SuppressionsScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

const BANNER_POLL_MS = 15_000;

/** D10 / "Requisitos para el cliente web": after signing in, a running execution is offered at once. */
function RunningExecutionBanner({ route }: { route: Route }) {
  const api = useApi();
  const [running, setRunning] = useState<ExecutionStatus>();
  useEffect(() => {
    let alive = true;
    const check = () =>
      api.executions
        .current()
        .then((current) => alive && setRunning(current && !current.finishedAt ? current : undefined))
        .catch(() => undefined);
    void check();
    const timer = setInterval(() => void check(), BANNER_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api]);
  if (!running || (route.name === 'execution' && route.executionId === running.executionId)) return null;
  return (
    <p className="banner" role="status">
      Hay una ejecución en curso del lote {running.period} / {running.block}. <a href={hrefOf({ name: 'execution', executionId: running.executionId })}>Ver progreso</a>
    </p>
  );
}

export function App() {
  const api = useApi();
  const route = useRoute();
  const [operator, setOperator] = useState<Operator | null>();

  useEffect(() => {
    let alive = true;
    void api.auth.restore().then((restored) => alive && setOperator(restored ?? null));
    const unsubscribe = api.auth.onSessionEnded(() => setOperator(null));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [api]);

  if (operator === undefined) return <p>Cargando…</p>;
  if (operator === null) return <SignInScreen onSignedIn={setOperator} />;

  return (
    <>
      <header>
        <strong>Bulk Mailer</strong>
        <nav aria-label="Principal">
          {NAV.map((item) => (
            <a key={item.label} href={hrefOf(item.route)} className={route.name === item.route.name ? 'active' : ''}>
              {item.label}
            </a>
          ))}
        </nav>
        <StatusIndicator />
        <span className="operator">
          {operator.username}{' '}
          <button
            type="button"
            onClick={() => {
              void api.auth.signOut().then(() => setOperator(null));
            }}
          >
            Cerrar sesión
          </button>
        </span>
      </header>
      <RunningExecutionBanner route={route} />
      <Screen route={route} />
    </>
  );
}
