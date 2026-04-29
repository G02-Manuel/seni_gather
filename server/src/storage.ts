import pg from 'pg';
import { StickyNote, WhiteboardStroke } from './types.js';

/**
 * Persistencia con PostgreSQL (Neon, Supabase, DO Managed, etc.).
 *
 * Variables de entorno:
 *   DATABASE_URL: connection string completa (recomendado).
 *
 * Solo se persisten salas marcadas como permanentes. Las salas efímeras
 * viven solo en memoria.
 */

export interface PersistedRoom {
  code: string;
  templateId: string;
  name: string;
  ownerName: string;
  createdAt: number;
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️  DATABASE_URL no definido. Las salas permanentes no se guardarán entre reinicios.');
}

// Pool con SSL automático para servicios cloud (Neon, Supabase, DO Managed)
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : null;

// -----------------------------------------------------------------
// Schema (idempotente)
// -----------------------------------------------------------------
async function initSchema() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        code         TEXT PRIMARY KEY,
        template_id  TEXT NOT NULL,
        name         TEXT NOT NULL,
        owner_name   TEXT NOT NULL DEFAULT '',
        created_at   BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sticky_notes (
        id           TEXT PRIMARY KEY,
        room_code    TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
        author_id    TEXT NOT NULL,
        author_name  TEXT NOT NULL,
        text         TEXT NOT NULL,
        color        TEXT NOT NULL,
        x            DOUBLE PRECISION NOT NULL,
        y            DOUBLE PRECISION NOT NULL,
        map_id       TEXT NOT NULL,
        created_at   BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sticky_room ON sticky_notes(room_code);

      CREATE TABLE IF NOT EXISTS whiteboard_strokes (
        id           TEXT PRIMARY KEY,
        room_code    TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
        seq          INTEGER NOT NULL,
        payload      JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_wb_room ON whiteboard_strokes(room_code, seq);
    `);
    console.log('💾 PostgreSQL schema listo');
  } finally {
    client.release();
  }
}

// Inicializar al cargar el módulo (no bloqueamos arranque del server)
initSchema().catch((e) => {
  console.error('❌ Error inicializando schema:', e.message);
});

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (!pool) return [];
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// -----------------------------------------------------------------
// API
// -----------------------------------------------------------------
export const Storage = {
  async saveRoom(r: PersistedRoom) {
    await query(
      `INSERT INTO rooms (code, template_id, name, owner_name, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (code) DO UPDATE
         SET template_id = EXCLUDED.template_id,
             name = EXCLUDED.name,
             owner_name = EXCLUDED.owner_name`,
      [r.code, r.templateId, r.name, r.ownerName, r.createdAt],
    );
  },

  async getRoom(code: string): Promise<PersistedRoom | undefined> {
    const rows = await query<any>(
      `SELECT code, template_id AS "templateId", name, owner_name AS "ownerName",
              created_at AS "createdAt"
       FROM rooms WHERE code = $1`,
      [code],
    );
    return rows[0];
  },

  async listRooms(): Promise<PersistedRoom[]> {
    return query<PersistedRoom>(
      `SELECT code, template_id AS "templateId", name, owner_name AS "ownerName",
              created_at AS "createdAt"
       FROM rooms ORDER BY created_at DESC`,
    );
  },

  async deleteRoom(code: string) {
    await query(`DELETE FROM rooms WHERE code = $1`, [code]);
  },

  async saveSticky(roomCode: string, n: StickyNote) {
    await query(
      `INSERT INTO sticky_notes
         (id, room_code, author_id, author_name, text, color, x, y, map_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text,
         color = EXCLUDED.color,
         x = EXCLUDED.x,
         y = EXCLUDED.y`,
      [n.id, roomCode, n.authorId, n.authorName, n.text, n.color, n.x, n.y, n.mapId, n.createdAt],
    );
  },

  async deleteSticky(id: string) {
    await query(`DELETE FROM sticky_notes WHERE id = $1`, [id]);
  },

  async listStickies(roomCode: string): Promise<StickyNote[]> {
    const rows = await query<any>(
      `SELECT id, author_id AS "authorId", author_name AS "authorName",
              text, color, x, y, map_id AS "mapId", created_at AS "createdAt"
       FROM sticky_notes WHERE room_code = $1`,
      [roomCode],
    );
    return rows;
  },

  /** Reemplaza completamente los strokes de una sala (snapshot atómico). */
  async replaceStrokes(roomCode: string, strokes: WhiteboardStroke[]) {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM whiteboard_strokes WHERE room_code = $1`, [roomCode]);
      for (let i = 0; i < strokes.length; i++) {
        const s = strokes[i];
        const id = s.id || `${roomCode}-${i}`;
        await client.query(
          `INSERT INTO whiteboard_strokes (id, room_code, seq, payload)
           VALUES ($1, $2, $3, $4::jsonb)
           ON CONFLICT (id) DO UPDATE SET seq = EXCLUDED.seq, payload = EXCLUDED.payload`,
          [id, roomCode, i, JSON.stringify(s)],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async listStrokes(roomCode: string): Promise<WhiteboardStroke[]> {
    const rows = await query<any>(
      `SELECT payload FROM whiteboard_strokes WHERE room_code = $1 ORDER BY seq ASC`,
      [roomCode],
    );
    return rows.map((r) => r.payload as WhiteboardStroke);
  },

  async clearStickiesOfRoom(roomCode: string) {
    await query(`DELETE FROM sticky_notes WHERE room_code = $1`, [roomCode]);
  },
};
