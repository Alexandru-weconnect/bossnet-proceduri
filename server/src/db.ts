import pg, { type PoolClient, type QueryResultRow } from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  allowExitOnIdle: config.nodeEnv !== "production",
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  max: 10,
  options: "-c statement_timeout=10000 -c idle_in_transaction_session_timeout=15000",
});

pool.on("error", (error) => {
  console.error("Conexiune PostgreSQL inactivă întreruptă", error.message);
});

export async function query<Row extends QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<Row>(text, values);
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
