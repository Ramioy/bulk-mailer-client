import { createContext, useContext, type ReactNode } from 'react';

import type { BulkMailerApi } from '../api/ports';

const ApiContext = createContext<BulkMailerApi | undefined>(undefined);

export function ApiProvider({ api, children }: { api: BulkMailerApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): BulkMailerApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi outside ApiProvider');
  return api;
}
