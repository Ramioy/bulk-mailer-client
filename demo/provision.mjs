// Demo: what the deployment team does once per environment, as the database owner, after `db:migrate`:
// the restricted application role (deploy/db/roles.sql) and one operator account. Runs inside the backend image.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client } = require('/app/node_modules/pg');
const { hashPassword } = require('/app/dist/adapters/outbound/auth/password-hasher.js');

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const client = new Client({ connectionString: env('OWNER_DATABASE_URL') });
await client.connect();
try {
  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'bulk_mailer_app'");
  const password = env('APP_DB_PASSWORD').replaceAll("'", "''");
  const roles = readFileSync('/app/deploy/db/roles.sql', 'utf8').replace(
    "CREATE ROLE bulk_mailer_app LOGIN PASSWORD :'app_password';",
    exists.rowCount ? `ALTER ROLE bulk_mailer_app PASSWORD '${password}';` : `CREATE ROLE bulk_mailer_app LOGIN PASSWORD '${password}';`,
  );
  await client.query(roles);
  await client.query(
    `INSERT INTO operator_accounts (operator_id, username, password_hash) VALUES ('op-demo', $1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [env('DEMO_OPERATOR'), await hashPassword(env('DEMO_OPERATOR_PASSWORD'))],
  );
  process.stdout.write('Provisioned: role bulk_mailer_app and the operator account\n');
} finally {
  await client.end();
}
