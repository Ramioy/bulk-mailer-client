import type { Session } from '../types';

/** Where the tokens live between page loads. Never in the URL (D12). */
export interface SessionStorage {
  load(): Session | undefined;
  save(session: Session): void;
  clear(): void;
}

const KEY = 'bulk-mailer.session';

/** Per browser tab: closing the tab ends the session on this device (the refresh token still expires on the server). */
export function browserSessionStorage(storage: Storage = window.sessionStorage): SessionStorage {
  return {
    load() {
      try {
        const raw = storage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Session) : undefined;
      } catch {
        return undefined;
      }
    },
    save: (session) => storage.setItem(KEY, JSON.stringify(session)),
    clear: () => storage.removeItem(KEY),
  };
}

export function memorySessionStorage(initial?: Session): SessionStorage {
  let current = initial;
  return {
    load: () => current,
    save: (session) => {
      current = session;
    },
    clear: () => {
      current = undefined;
    },
  };
}
