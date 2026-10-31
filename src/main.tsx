import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createHttpApi } from './api/http/http-bulk-mailer-api';
import { ApiProvider } from './ui/api-context';
import { App } from './ui/App';
import './styles.css';

// Default `/api`: the dev server (and a same-origin reverse proxy in deployment) forwards it to the backend.
const api = createHttpApi({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiProvider api={api}>
      <App />
    </ApiProvider>
  </StrictMode>,
);
