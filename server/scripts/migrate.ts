import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_OWNER_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_OWNER_URL sau DATABASE_URL este obligatoriu");

const pool = new Pool({ connectionString: databaseUrl, max: 1 });
const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error("DATABASE_API_ROLE conține caractere nepermise");
  }
  return `"${identifier}"`;
}

try {
  await pool.query("create schema if not exists bossnet");
  await pool.query(`
    create table if not exists bossnet.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+.*\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const exists = await pool.query(
      "select 1 from bossnet.schema_migrations where version = $1",
      [file],
    );
    if (exists.rowCount) continue;

    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into bossnet.schema_migrations (version) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`Migrare aplicată: ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  const apiRoleName = process.env.DATABASE_API_ROLE?.trim();
  if (apiRoleName) {
    const apiRole = quoteIdentifier(apiRoleName);
    await pool.query(`revoke all on schema bossnet from public`);
    await pool.query(`revoke all on all tables in schema bossnet from ${apiRole}`);
    await pool.query(`revoke all on all sequences in schema bossnet from ${apiRole}`);
    await pool.query(`grant usage on schema bossnet to ${apiRole}`);
    await pool.query(`grant select on bossnet.app_users, bossnet.departments, bossnet.department_memberships to ${apiRole}`);
    await pool.query(`grant select, insert, update, delete on bossnet.auth_sessions to ${apiRole}`);
    await pool.query(`grant update (google_subject, last_login_at, updated_at) on bossnet.app_users to ${apiRole}`);
    await pool.query(`grant usage, select on all sequences in schema bossnet to ${apiRole}`);
    console.log(`Permisiuni API limitate aplicate rolului ${apiRoleName}`);
  }
} finally {
  await pool.end();
}
