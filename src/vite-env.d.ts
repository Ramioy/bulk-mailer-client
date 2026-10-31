interface ImportMetaEnv {
  /** Backend base URL; default `/api` (proxied by the dev server). */
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
