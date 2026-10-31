import { useState } from 'react';

import type { Operator } from '../../api/types';
import { useApi } from '../api-context';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAction } from '../hooks';

export function SignInScreen({ onSignedIn }: { onSignedIn: (operator: Operator) => void }) {
  const api = useApi();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useAction((u: string, p: string) => api.auth.signIn(u, p));

  return (
    <main className="sign-in">
      <h1>Bulk Mailer</h1>
      <form
        aria-label="Iniciar sesión"
        onSubmit={async (event) => {
          event.preventDefault();
          const operator = await signIn.run(username, password);
          if (operator) onSignedIn(operator);
        }}
      >
        <label>
          Usuario
          <input name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={signIn.running}>
          Iniciar sesión
        </button>
        <ErrorMessage error={signIn.error} />
      </form>
    </main>
  );
}
