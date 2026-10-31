import "server-only";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { WELCOME_LETTER } from "./welcome";

type DB = NodePgDatabase<typeof schema>;

// Each migration runs once, in order. Never edit an old one; add a new one instead.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS letters (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    is_draft BOOLEAN NOT NULL DEFAULT TRUE,
    release_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    first_opened_at TIMESTAMPTZ,
    posted_notified_at TIMESTAMPTZ,
    released_notified_at TIMESTAMPTZ
  );
  CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    letter_id INTEGER NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (letter_id, emoji)
  );
  CREATE TABLE IF NOT EXISTS replies (
    id SERIAL PRIMARY KEY,
    letter_id INTEGER NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_by_admin BOOLEAN NOT NULL DEFAULT FALSE
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL DEFAULT '',
    notify_posted BOOLEAN NOT NULL DEFAULT FALSE,
    notify_released BOOLEAN NOT NULL DEFAULT FALSE
  );
  `,
  // 1: per-letter wax-seal stamp
  `ALTER TABLE letters ADD COLUMN IF NOT EXISTS seal TEXT NOT NULL DEFAULT 'S';`,
];

type RawExec = (sql: string) => Promise<unknown>;
type RawQuery = (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;

async function connect(): Promise<{ db: DB; exec: RawExec; query: RawQuery }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      // Neon URLs carry sslmode=require (TLS with certificate checks); only add TLS if the URL doesn't say.
      ssl: /sslmode=|localhost|127\.0\.0\.1/.test(url) ? undefined : true,
      max: 5,
    });
    return {
      db: drizzlePg(pool, { schema }),
      exec: (sql) => pool.query(sql),
      query: (sql) => pool.query(sql),
    };
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_FILE_DB) {
    throw new Error(
      "DATABASE_URL is not set. On Render the disk is wiped on every deploy, so letters would be lost. Set DATABASE_URL to your Neon Postgres URL.",
    );
  }

  // Local development: an embedded Postgres stored in .data/pglite
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzleLite } = await import("drizzle-orm/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync("./.data/pglite", { recursive: true });
  const client = new PGlite("./.data/pglite");
  return {
    db: drizzleLite(client, { schema }) as unknown as DB,
    exec: (sql) => client.exec(sql),
    query: (sql) => client.query(sql) as Promise<{ rows: Record<string, unknown>[] }>,
  };
}

async function migrateAndSeed(conn: Awaited<ReturnType<typeof connect>>) {
  await conn.exec(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const done = new Set((await conn.query(`SELECT id FROM _migrations`)).rows.map((r) => Number(r.id)));
  for (let i = 0; i < MIGRATIONS.length; i++) {
    if (done.has(i)) continue;
    await conn.exec(MIGRATIONS[i]);
    await conn.exec(`INSERT INTO _migrations (id) VALUES (${i}) ON CONFLICT DO NOTHING`);
  }

  // First run ever: create the settings row and the welcome letter.
  const existing = await conn.db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (existing.length === 0) {
    await conn.db.insert(schema.settings).values({ id: 1 }).onConflictDoNothing();
    const now = new Date();
    await conn.db.insert(schema.letters).values({
      title: WELCOME_LETTER.title,
      content: WELCOME_LETTER.content,
      isDraft: false,
      releaseAt: now,
      postedNotifiedAt: now,
      releasedNotifiedAt: now,
    });
  }
}

const g = globalThis as unknown as { __letterDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__letterDb) {
    g.__letterDb = (async () => {
      const conn = await connect();
      await migrateAndSeed(conn);
      return conn.db;
    })().catch((err) => {
      g.__letterDb = undefined;
      throw err;
    });
  }
  return g.__letterDb;
}

export { schema };
