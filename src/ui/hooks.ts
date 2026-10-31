import { useCallback, useEffect, useRef, useState } from 'react';

export interface Loadable<T> {
  readonly data: T | undefined;
  readonly error: unknown;
  readonly loading: boolean;
  reload(): Promise<void>;
}

/** Loads `load()` now and whenever `deps` change; `reload` repeats it. Late answers of an older load are dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]): Loadable<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    try {
      const value = await run();
      if (mine === generation.current) {
        setData(value);
        setError(undefined);
      }
    } catch (e) {
      if (mine === generation.current) setError(e);
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

/** Runs an action, keeping its error and whether it is running. */
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>();
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setRunning(true);
      setError(undefined);
      try {
        return await action(...args);
      } catch (e) {
        setError(e);
        return undefined;
      } finally {
        setRunning(false);
      }
    },
    [action],
  );
  return { run, running, error, clearError: () => setError(undefined) };
}
