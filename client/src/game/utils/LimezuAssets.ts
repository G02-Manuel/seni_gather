/**
 * Mapeo central de assets pixel-art LimeZu (Modern Interiors v41).
 *
 * - Tilesets se precargan en GameScene.preload().
 * - Para tipos de mueble se devuelve la spec de qué sheet + qué frame(s)
 *   se deben renderizar y a qué tamaño en pantalla.
 *
 * Los frames son índices dentro de un spritesheet de 16×16 cargado con
 * `this.load.spritesheet(key, url, { frameWidth: 16, frameHeight: 16 })`.
 *
 * Si los frames no se ven bien, ajustar las constantes de aquí.
 *
 * Crédito: limezu.itch.io (Modern Interiors RPG Tileset)
 */
import Phaser from 'phaser';

// ---------- KEYS DE TILESETS (deben coincidir con preload de GameScene) ----------
export const LZ_KEYS = {
  ROOM_BUILDER: 'lz_room_builder',
  GENERIC: 'lz_generic',
  LIVING_ROOM: 'lz_living_room',
  CONFERENCE: 'lz_conference',
} as const;

// ---------- DIMENSIONES DE LAS HOJAS (en celdas 16×16) ----------
// room_builder: 1216×1808 → 76 cols × 113 rows
// generic:      256×1248  → 16 cols × 78  rows
// living_room:  256×720   → 16 cols × 45  rows
// conference:   256×192   → 16 cols × 12  rows
export const LZ_COLS = {
  ROOM_BUILDER: 76,
  GENERIC: 16,
  LIVING_ROOM: 16,
  CONFERENCE: 16,
} as const;

/** Convierte (col,row) -> índice de frame plano */
export const xy = (col: number, row: number, cols: number) => row * cols + col;

// ---------- TILES PARA EL MAPA "OFFICE" ----------
// Estimaciones visuales de los tiles dentro de Room_Builder_16x16.png.
// Si algún tile sale mal, ajustar (col,row) en estos objetos.
export const OFFICE_TILES = {
  /** Suelo principal: madera clara */
  floorWood: xy(2, 50, LZ_COLS.ROOM_BUILDER),
  /** Suelo alfombra/acento (debajo de mesas, zona meeting) */
  floorCarpet: xy(48, 12, LZ_COLS.ROOM_BUILDER),
  /** Pared vertical (frente al jugador) */
  wall: xy(50, 80, LZ_COLS.ROOM_BUILDER),
};

// ---------- MUEBLES ----------
/**
 * Cada entry describe un sprite de mueble:
 * - sheet: clave del spritesheet
 * - col/row: posición en celdas 16×16 dentro del sheet
 * - w/h:    tamaño del sprite en celdas (1×1, 2×2, 3×3 …)
 * - scale:  factor de escala visual (1 = 1 px LimeZu = 1 px pantalla;
 *           2 = duplica para que se vea bien con el TILE de 32 px del juego)
 *
 * Si un tipo no está en este map, se cae al render anterior (rectángulo+emoji).
 */
export interface FurnitureSpec {
  sheet: string;
  col: number;
  row: number;
  w: number;       // ancho en celdas 16×16
  h: number;       // alto  en celdas 16×16
  scale?: number;  // por defecto 2
}

export const FURNITURE_SPECS: Record<string, FurnitureSpec> = {
  // === Conference Hall (oficina) ===
  desk:        { sheet: LZ_KEYS.CONFERENCE,  col: 0,  row: 1,  w: 4, h: 2 },  // mesa larga oficina
  chair:       { sheet: LZ_KEYS.CONFERENCE,  col: 12, row: 4,  w: 1, h: 2 },  // silla giratoria
  // === Living Room ===
  sofa:        { sheet: LZ_KEYS.LIVING_ROOM, col: 0,  row: 24, w: 4, h: 3 },  // sofá grande
  tv:          { sheet: LZ_KEYS.LIVING_ROOM, col: 0,  row: 41, w: 3, h: 3 },  // TV stand abajo
  lamp:        { sheet: LZ_KEYS.LIVING_ROOM, col: 11, row: 9,  w: 1, h: 2 },  // lámpara mesa
  plant:       { sheet: LZ_KEYS.LIVING_ROOM, col: 12, row: 0,  w: 1, h: 2 },  // planta verde
  bookshelf:   { sheet: LZ_KEYS.LIVING_ROOM, col: 9,  row: 22, w: 3, h: 5 },  // estantería libros
  books:       { sheet: LZ_KEYS.LIVING_ROOM, col: 9,  row: 22, w: 3, h: 5 },  // alias = estantería
  // === Generic ===
  bed:         { sheet: LZ_KEYS.GENERIC,     col: 0,  row: 0,  w: 3, h: 4 },
  rug:         { sheet: LZ_KEYS.GENERIC,     col: 8,  row: 1,  w: 4, h: 3 },
  fridge:      { sheet: LZ_KEYS.GENERIC,     col: 0,  row: 8,  w: 2, h: 3 },
  // === Naturaleza (fallback con sheets disponibles) ===
  tree:        { sheet: LZ_KEYS.LIVING_ROOM, col: 13, row: 16, w: 1, h: 2 }, // planta grande
  flower:      { sheet: LZ_KEYS.LIVING_ROOM, col: 13, row: 0,  w: 1, h: 1 },
  bench:       { sheet: LZ_KEYS.CONFERENCE,  col: 8,  row: 5,  w: 2, h: 2 },
  picnictable: { sheet: LZ_KEYS.CONFERENCE,  col: 0,  row: 1,  w: 4, h: 2 },
  fire:        { sheet: LZ_KEYS.LIVING_ROOM, col: 8,  row: 18, w: 2, h: 3 }, // chimenea
  coffee:      { sheet: LZ_KEYS.GENERIC,     col: 12, row: 67, w: 1, h: 1 }, // taza/jarra
  screen:      { sheet: LZ_KEYS.LIVING_ROOM, col: 0,  row: 41, w: 3, h: 3 }, // TV stand
};

/**
 * Construye un Container Phaser con el sprite del mueble centrado en (0,0).
 * Devuelve null si el tipo no está en FURNITURE_SPECS o si la textura no
 * está cargada todavía (el caller debe usar fallback).
 */
export function buildLimezuFurniture(
  scene: Phaser.Scene,
  type: string
): Phaser.GameObjects.Container | null {
  const spec = FURNITURE_SPECS[type];
  if (!spec) return null;
  if (!scene.textures.exists(spec.sheet)) return null;

  const c = scene.add.container(0, 0);
  const scale = spec.scale ?? 2;
  const cellPx = 16 * scale;

  // Si el mueble es de varias celdas, las componemos una a una en grilla.
  const cols = spec.sheet === LZ_KEYS.ROOM_BUILDER ? LZ_COLS.ROOM_BUILDER
            : spec.sheet === LZ_KEYS.GENERIC ? LZ_COLS.GENERIC
            : spec.sheet === LZ_KEYS.LIVING_ROOM ? LZ_COLS.LIVING_ROOM
            : LZ_COLS.CONFERENCE;

  // Offset para que el sprite quede centrado en (0,0)
  const offX = -((spec.w - 1) * cellPx) / 2;
  const offY = -((spec.h - 1) * cellPx) / 2;

  for (let dy = 0; dy < spec.h; dy++) {
    for (let dx = 0; dx < spec.w; dx++) {
      const frame = xy(spec.col + dx, spec.row + dy, cols);
      try {
        const img = scene.add.image(offX + dx * cellPx, offY + dy * cellPx, spec.sheet, frame)
          .setOrigin(0.5)
          .setScale(scale);
        c.add(img);
      } catch {
        // frame fuera de rango → ignorar esa celda
      }
    }
  }

  return c;
}

/**
 * Pre-carga todos los tilesets LimeZu en una escena Phaser. Idempotente.
 */
export function preloadLimezuTilesets(scene: Phaser.Scene) {
  if (!scene.textures.exists(LZ_KEYS.ROOM_BUILDER)) {
    scene.load.spritesheet(LZ_KEYS.ROOM_BUILDER, '/tilesets/room_builder.png',
      { frameWidth: 16, frameHeight: 16 });
  }
  if (!scene.textures.exists(LZ_KEYS.GENERIC)) {
    scene.load.spritesheet(LZ_KEYS.GENERIC, '/tilesets/generic.png',
      { frameWidth: 16, frameHeight: 16 });
  }
  if (!scene.textures.exists(LZ_KEYS.LIVING_ROOM)) {
    scene.load.spritesheet(LZ_KEYS.LIVING_ROOM, '/tilesets/living_room.png',
      { frameWidth: 16, frameHeight: 16 });
  }
  if (!scene.textures.exists(LZ_KEYS.CONFERENCE)) {
    scene.load.spritesheet(LZ_KEYS.CONFERENCE, '/tilesets/conference_hall.png',
      { frameWidth: 16, frameHeight: 16 });
  }
}
