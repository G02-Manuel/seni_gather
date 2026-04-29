import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { StickyNote, WhiteboardStroke } from './types.js';

/**
 * Persistencia ligera con SQLite. Solo se persisten salas marcadas como
 * permanentes. Para salas efímeras, todo vive en memoria.
 *
 * Ruta de la BD configurable con DATA_DIR (en DigitalOcean App Platform
 * apuntar a un Volume montado, p.ej. /workspace/data).
 */

export interface PersistedRoom {
  code: string;
  templateId: string;
  name: string;
  ownerName: string;
  createdAt: number;
}

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'orbitra.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// -----------------------------------------------------------------
// Schema
// -----------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    templateId  TEXT NOT NULL,
    name        TEXT NOT NULL,
    ownerName   TEXT NOT NULL DEFAULT '',
    createdAt   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sticky_notes (
    id          TEXT PRIMARY KEY,
    roomCode    TEXT NOT NULL,
    authorId    TEXT NOT NULL,
    authorName  TEXT NOT NULL,
    text        TEXT NOT NULL,
    color       TEXT NOT NULL,
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    mapId       TEXT NOT NULL,
    createdAt   INTEGER NOT NULL,
    FOREIGN KEY (roomCode) REFERENCES rooms(code) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_sticky_room ON sticky_notes(roomCode);

  CREATE TABLE IF NOT EXISTS whiteboard_strokes (
    id          TEXT PRIMARY KEY,
    roomCode    TEXT NOT NULL,
    seq         INTEGER NOT NULL,
    payload     TEXT NOT NULL,
    FOREIGN KEY (roomCode) REFERENCES rooms(code) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_wb_room ON whiteboard_strokes(roomCode, seq);
`);

// -----------------------------------------------------------------
// Statements
// -----------------------------------------------------------------
const stmtInsertRoom = db.prepare(`
  INSERT OR REPLACE INTO rooms (code, templateId, name, ownerName, createdAt)
  VALUES (@code, @templateId, @name, @ownerName, @createdAt)
`);
const stmtGetRoom = db.prepare(`SELECT * FROM rooms WHERE code = ?`);
const stmtListRooms = db.prepare(`SELECT * FROM rooms ORDER BY createdAt DESC`);
const stmtDeleteRoom = db.prepare(`DELETE FROM rooms WHERE code = ?`);

const stmtInsertSticky = db.prepare(`
  INSERT OR REPLACE INTO sticky_notes
    (id, roomCode, authorId, authorName, text, color, x, y, mapId, createdAt)
  VALUES (@id, @roomCode, @authorId, @authorName, @text, @color, @x, @y, @mapId, @createdAt)
`);
const stmtDeleteSticky = db.prepare(`DELETE FROM sticky_notes WHERE id = ?`);
const stmtListStickies = db.prepare(`SELECT * FROM sticky_notes WHERE roomCode = ?`);
const stmtClearStickiesOfRoom = db.prepare(`DELETE FROM sticky_notes WHERE roomCode = ?`);

const stmtInsertStroke = db.prepare(`
  INSERT OR REPLACE INTO whiteboard_strokes (id, roomCode, seq, payload)
  VALUES (?, ?, ?, ?)
`);
const stmtClearStrokes = db.prepare(`DELETE FROM whiteboard_strokes WHERE roomCode = ?`);
const stmtListStrokes = db.prepare(`SELECT payload FROM whiteboard_strokes WHERE roomCode = ? ORDER BY seq ASC`);

// -----------------------------------------------------------------
// API
// -----------------------------------------------------------------
export const Storage = {
  saveRoom(r: PersistedRoom) {
    stmtInsertRoom.run(r);
  },

  getRoom(code: string): PersistedRoom | undefined {
    return stmtGetRoom.get(code) as PersistedRoom | undefined;
  },

  listRooms(): PersistedRoom[] {
    return stmtListRooms.all() as PersistedRoom[];
  },

  deleteRoom(code: string) {
    stmtDeleteRoom.run(code);
  },

  saveSticky(roomCode: string, n: StickyNote) {
    stmtInsertSticky.run({ ...n, roomCode });
  },

  deleteSticky(id: string) {
    stmtDeleteSticky.run(id);
  },

  listStickies(roomCode: string): StickyNote[] {
    const rows = stmtListStickies.all(roomCode) as any[];
    return rows.map(r => ({
      id: r.id,
      authorId: r.authorId,
      authorName: r.authorName,
      text: r.text,
      color: r.color,
      x: r.x,
      y: r.y,
      mapId: r.mapId,
      createdAt: r.createdAt,
    }));
  },

  /** Reemplaza completamente los strokes de una sala. Llamar al "snapshotear". */
  replaceStrokes(roomCode: string, strokes: WhiteboardStroke[]) {
    const tx = db.transaction((items: WhiteboardStroke[]) => {
      stmtClearStrokes.run(roomCode);
      items.forEach((s, i) => {
        const id = s.id || `${roomCode}-${i}`;
        stmtInsertStroke.run(id, roomCode, i, JSON.stringify(s));
      });
    });
    tx(strokes);
  },

  listStrokes(roomCode: string): WhiteboardStroke[] {
    const rows = stmtListStrokes.all(roomCode) as any[];
    return rows.map(r => {
      try { return JSON.parse(r.payload) as WhiteboardStroke; }
      catch { return null as any; }
    }).filter(Boolean);
  },

  clearStickiesOfRoom(roomCode: string) {
    stmtClearStickiesOfRoom.run(roomCode);
  },
};

console.log(`💾 SQLite listo en ${DB_PATH}`);
