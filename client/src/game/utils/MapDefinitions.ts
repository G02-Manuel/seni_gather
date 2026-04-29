import { MapDefinition, CONSTANTS } from '../../types';

// =====================================================================
// Helpers
// =====================================================================
function blank(w: number, h: number): number[][] {
  const m: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) row.push(0);
    m.push(row);
  }
  return m;
}
function rect(m: number[][], x: number, y: number, w: number, h: number, val: number) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++)
      if (m[yy] && xx >= 0 && xx < m[yy].length) m[yy][xx] = val;
}
function hWall(m: number[][], x: number, y: number, w: number) {
  for (let xx = x; xx < x + w; xx++) if (m[y]) m[y][xx] = 1;
}
function vWall(m: number[][], x: number, y: number, h: number) {
  for (let yy = y; yy < y + h; yy++) if (m[yy]) m[yy][x] = 1;
}
function withBorder(m: number[][]) {
  const h = m.length, w = m[0].length;
  for (let x = 0; x < w; x++) { m[0][x] = 1; m[h-1][x] = 1; }
  for (let y = 0; y < h; y++) { m[y][0] = 1; m[y][w-1] = 1; }
  return m;
}

const T = CONSTANTS.TILE_SIZE;
const px = (tile: number) => tile * T + T / 2;

// Tipos de tile:
//  0 floor base, 1 wall, 2 carpet, 3 wood, 4 dirt/path, 5 grass, 6 water/glass

// =====================================================================
// 1) OFICINA TRADICIONAL
// =====================================================================
function buildOffice(): MapDefinition {
  const W = 70, H = 45;
  const tiles = blank(W, H);
  withBorder(tiles);

  // Oficina (top-left)
  rect(tiles, 4, 4, 8, 6, 2);
  rect(tiles, 16, 4, 12, 6, 2);
  rect(tiles, 4, 14, 24, 6, 2);
  rect(tiles, 14, 11, 2, 8, 3);
  hWall(tiles, 4, 10, 8);  tiles[10][7] = 0; tiles[10][8] = 0;
  hWall(tiles, 16, 10, 12); tiles[10][20] = 0; tiles[10][21] = 0;

  // Pared vertical separadora
  vWall(tiles, 30, 1, 22);
  tiles[6][30] = 0;  tiles[7][30] = 0;
  tiles[16][30] = 0; tiles[17][30] = 0;

  // Coworking (top-right)
  rect(tiles, 33, 3, 14, 8, 3);
  rect(tiles, 50, 3, 17, 9, 2);
  rect(tiles, 35, 14, 8, 6, 2);
  rect(tiles, 52, 14, 14, 6, 2);

  // Pared horizontal hacia auditorio
  hWall(tiles, 1, 23, 68);
  tiles[23][14] = 0; tiles[23][15] = 0;
  tiles[23][35] = 0; tiles[23][36] = 0;
  tiles[23][55] = 0; tiles[23][56] = 0;

  // Auditorio
  rect(tiles, 8, 38, 54, 4, 3);
  for (let row = 0; row < 4; row++) rect(tiles, 8, 26 + row * 3, 54, 2, 2);

  const chairs = [
    { id: 'office_c1', x: px(6),  y: px(6), facing: 'right' as const },
    { id: 'office_c2', x: px(10), y: px(6), facing: 'left' as const },
    { id: 'office_c3', x: px(6),  y: px(8), facing: 'right' as const },
    { id: 'office_c4', x: px(10), y: px(8), facing: 'left' as const },
    { id: 'office_c5', x: px(20), y: px(6), facing: 'right' as const },
    { id: 'office_c6', x: px(26), y: px(6), facing: 'left' as const },
    { id: 'office_c7', x: px(20), y: px(8), facing: 'right' as const },
    { id: 'office_c8', x: px(26), y: px(8), facing: 'left' as const },
    { id: 'office_c9',  x: px(7),  y: px(16), facing: 'down' as const },
    { id: 'office_c10', x: px(11), y: px(16), facing: 'down' as const },
    { id: 'office_c11', x: px(20), y: px(16), facing: 'down' as const },
    { id: 'office_c12', x: px(24), y: px(16), facing: 'down' as const },
    { id: 'cw_c1', x: px(35), y: px(5), facing: 'down' as const },
    { id: 'cw_c2', x: px(39), y: px(5), facing: 'down' as const },
    { id: 'cw_c3', x: px(43), y: px(5), facing: 'down' as const },
    { id: 'cw_c4', x: px(35), y: px(9), facing: 'up' as const },
    { id: 'cw_c5', x: px(39), y: px(9), facing: 'up' as const },
    { id: 'cw_c6', x: px(43), y: px(9), facing: 'up' as const },
    { id: 'cw_c7',  x: px(54), y: px(6), facing: 'right' as const },
    { id: 'cw_c8',  x: px(64), y: px(6), facing: 'left' as const },
    { id: 'cw_c9',  x: px(38), y: px(17), facing: 'down' as const },
    { id: 'cw_c10', x: px(58), y: px(17), facing: 'down' as const },
  ];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 13; col++) {
      chairs.push({ id: `aud_r${row}_c${col}`, x: px(9 + col * 4), y: px(27 + row * 3), facing: 'down' as const });
    }
  }

  return {
    id: 'office',
    name: 'Oficina Tradicional',
    widthTiles: W, heightTiles: H, tileSize: T,
    bgColor: 0x2a2d3e,
    wallColor: 0x4a5168,
    accentColor: 0x667eea,
    tiles,
    spawnX: 8, spawnY: 16,
    teleports: [],
    chairs,
    privateZones: [
      { id: 'meet_left',  name: 'Sala Reunión A', x: 4,  y: 4,  width: 8,  height: 6, color: '#4ade80' },
      { id: 'meet_right', name: 'Sala Reunión B', x: 16, y: 4,  width: 12, height: 6, color: '#facc15' },
      { id: 'office_open', name: 'Open Space', x: 4, y: 14, width: 24, height: 6, color: '#667eea' },
      { id: 'cw_desks',  name: 'Coworking · Escritorios', x: 33, y: 3,  width: 14, height: 8,  color: '#22d3ee' },
      { id: 'cw_lounge', name: 'Lounge Café',             x: 50, y: 3,  width: 17, height: 9,  color: '#10b981' },
      { id: 'cw_pods',   name: 'Coworking · Pods',        x: 33, y: 14, width: 34, height: 6,  color: '#a78bfa' },
      { id: 'aud_seating', name: 'Auditorio · Butacas', x: 8, y: 26, width: 54, height: 11, color: '#f59e0b' },
      { id: 'aud_stage',   name: 'Escenario',           x: 8, y: 38, width: 54, height: 4,  color: '#ef4444' },
    ],
    whiteboards: [
      { id: 'office_wb_a', x: px(8),  y: px(4) - 8, width: 96, height: 16 },
      { id: 'office_wb_b', x: px(22), y: px(4) - 8, width: 96, height: 16 },
      { id: 'cw_wb',       x: px(40), y: px(13) - 6, width: 96, height: 14 },
    ],
    screens: [
      { id: 'office_tv',  x: px(22), y: px(4) - 8,   width: 96,  height: 16, defaultUrl: '' },
      { id: 'aud_screen', x: px(35), y: px(38) - 16, width: 256, height: 32, defaultUrl: '' },
    ],
    decorations: [
      { type: 'desk', x: px(8),  y: px(7) },
      { type: 'desk', x: px(22), y: px(7) },
      { type: 'desk', x: px(9),  y: px(16) },
      { type: 'desk', x: px(22), y: px(16) },
      { type: 'plant', x: px(2), y: px(2) },
      { type: 'plant', x: px(2), y: px(21) },
      { type: 'desk', x: px(39), y: px(7) },
      { type: 'desk', x: px(38), y: px(17) },
      { type: 'desk', x: px(58), y: px(17) },
      { type: 'plant', x: px(32), y: px(2) },
      { type: 'plant', x: px(68), y: px(2) },
      { type: 'coffee', x: px(60), y: px(4) },
      { type: 'plant', x: px(2),  y: px(43) },
      { type: 'plant', x: px(68), y: px(43) },
    ],
  };
}

// =====================================================================
// 2) NATURALEZA – con parque (tierra, árboles, bancos, estanque)
// =====================================================================
function buildNature(): MapDefinition {
  const W = 70, H = 45;
  // Suelo base = grass (5)
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) row.push(5);
    tiles.push(row);
  }
  withBorder(tiles);

  // Cabaña-oficina (top-left): suelo madera, paredes
  rect(tiles, 4, 4, 22, 9, 3);
  hWall(tiles, 4, 4, 22);
  hWall(tiles, 4, 13, 22);
  vWall(tiles, 4, 4, 10);
  vWall(tiles, 25, 4, 10);
  // puertas
  tiles[13][14] = 3; tiles[13][15] = 3;

  // Coworking-cabaña (top-right)
  rect(tiles, 30, 3, 18, 10, 3);
  hWall(tiles, 30, 3, 18);
  hWall(tiles, 30, 13, 18);
  vWall(tiles, 30, 3, 10);
  vWall(tiles, 47, 3, 10);
  tiles[13][38] = 3; tiles[13][39] = 3;

  // PARQUE / zona break (centro y abajo a la derecha)
  // Caminos de tierra (4)
  rect(tiles, 14, 14, 4, 25, 4);   // sendero vertical
  rect(tiles, 18, 22, 30, 3, 4);   // sendero horizontal
  // Zona estanque (6) en el parque
  rect(tiles, 50, 18, 8, 6, 6);
  // Zona descanso con tierra
  rect(tiles, 22, 28, 14, 10, 4);
  // Zona picnic (carpet=2) sobre el césped
  rect(tiles, 40, 28, 12, 8, 2);

  // Anfiteatro al sur
  rect(tiles, 8, 40, 54, 3, 3);

  const chairs = [
    // Cabaña oficina – mesa de reuniones
    { id: 'nat_off1', x: px(8),  y: px(7), facing: 'down' as const },
    { id: 'nat_off2', x: px(12), y: px(7), facing: 'down' as const },
    { id: 'nat_off3', x: px(16), y: px(7), facing: 'down' as const },
    { id: 'nat_off4', x: px(8),  y: px(11), facing: 'up' as const },
    { id: 'nat_off5', x: px(12), y: px(11), facing: 'up' as const },
    { id: 'nat_off6', x: px(16), y: px(11), facing: 'up' as const },
    { id: 'nat_off7', x: px(21), y: px(7), facing: 'down' as const },
    { id: 'nat_off8', x: px(21), y: px(11), facing: 'up' as const },
    // Cabaña coworking
    { id: 'nat_cw1', x: px(34), y: px(6), facing: 'down' as const },
    { id: 'nat_cw2', x: px(38), y: px(6), facing: 'down' as const },
    { id: 'nat_cw3', x: px(42), y: px(6), facing: 'down' as const },
    { id: 'nat_cw4', x: px(46), y: px(6), facing: 'down' as const },
    { id: 'nat_cw5', x: px(34), y: px(11), facing: 'up' as const },
    { id: 'nat_cw6', x: px(38), y: px(11), facing: 'up' as const },
    { id: 'nat_cw7', x: px(42), y: px(11), facing: 'up' as const },
    { id: 'nat_cw8', x: px(46), y: px(11), facing: 'up' as const },
    // BANCOS DEL PARQUE (zona break) – sillas mirando hacia el centro
    { id: 'park_b1', x: px(24), y: px(30), facing: 'down' as const },
    { id: 'park_b2', x: px(28), y: px(30), facing: 'down' as const },
    { id: 'park_b3', x: px(32), y: px(30), facing: 'down' as const },
    { id: 'park_b4', x: px(24), y: px(36), facing: 'up' as const },
    { id: 'park_b5', x: px(28), y: px(36), facing: 'up' as const },
    { id: 'park_b6', x: px(32), y: px(36), facing: 'up' as const },
    // Picnic
    { id: 'pic_1', x: px(42), y: px(30), facing: 'right' as const },
    { id: 'pic_2', x: px(50), y: px(30), facing: 'left' as const },
    { id: 'pic_3', x: px(42), y: px(34), facing: 'right' as const },
    { id: 'pic_4', x: px(50), y: px(34), facing: 'left' as const },
    // Junto al estanque
    { id: 'pond_1', x: px(48), y: px(20), facing: 'right' as const },
    { id: 'pond_2', x: px(60), y: px(20), facing: 'left' as const },
  ];
  // Anfiteatro
  for (let col = 0; col < 13; col++) {
    chairs.push({ id: `nat_aud_${col}`, x: px(9 + col * 4), y: px(41), facing: 'down' as const });
  }

  return {
    id: 'nature',
    name: 'Refugio Natural',
    widthTiles: W, heightTiles: H, tileSize: T,
    bgColor: 0x1f3a2b,
    wallColor: 0x6b4423,
    accentColor: 0x84cc16,
    tiles,
    spawnX: 16, spawnY: 18,
    teleports: [],
    chairs,
    privateZones: [
      { id: 'nat_office',   name: 'Cabaña Oficina',     x: 4,  y: 4,  width: 22, height: 9,  color: '#8b5a2b' },
      { id: 'nat_cw',       name: 'Cabaña Coworking',   x: 30, y: 3,  width: 18, height: 10, color: '#a16207' },
      { id: 'park_break',   name: '🌳 Parque · Break',  x: 22, y: 28, width: 14, height: 10, color: '#84cc16' },
      { id: 'pond',         name: '💧 Estanque',         x: 50, y: 18, width: 8,  height: 6,  color: '#38bdf8' },
      { id: 'picnic',       name: '🧺 Picnic',           x: 40, y: 28, width: 12, height: 8,  color: '#facc15' },
      { id: 'amphi',        name: '🎤 Anfiteatro',       x: 8,  y: 40, width: 54, height: 3,  color: '#fb923c' },
    ],
    whiteboards: [
      { id: 'nat_wb', x: px(15), y: px(4) - 4, width: 96, height: 14 },
    ],
    screens: [
      { id: 'amphi_screen', x: px(35), y: px(40) - 14, width: 256, height: 28, defaultUrl: '' },
    ],
    decorations: [
      // Cabañas
      { type: 'desk', x: px(12), y: px(8) },
      { type: 'desk', x: px(40), y: px(8) },
      // Árboles a montón en el parque
      { type: 'tree', x: px(20), y: px(20) },
      { type: 'tree', x: px(38), y: px(18) },
      { type: 'tree', x: px(45), y: px(36) },
      { type: 'tree', x: px(60), y: px(30) },
      { type: 'tree', x: px(63), y: px(38) },
      { type: 'tree', x: px(20), y: px(38) },
      { type: 'tree', x: px(38), y: px(38) },
      { type: 'tree', x: px(8),  y: px(28) },
      { type: 'tree', x: px(8),  y: px(36) },
      { type: 'tree', x: px(28), y: px(20) },
      { type: 'tree', x: px(50), y: px(40) },
      { type: 'tree', x: px(64), y: px(20) },
      // Bancos y mesa picnic visuales
      { type: 'bench', x: px(28), y: px(30) },
      { type: 'bench', x: px(28), y: px(36) },
      { type: 'picnictable', x: px(46), y: px(32) },
      // Fogata
      { type: 'fire',  x: px(28), y: px(33) },
      // Flores
      { type: 'flower', x: px(15), y: px(18) },
      { type: 'flower', x: px(36), y: px(20) },
      { type: 'flower', x: px(60), y: px(36) },
      { type: 'flower', x: px(50), y: px(42) },
      // Plantas en cabañas
      { type: 'plant', x: px(5),  y: px(12) },
      { type: 'plant', x: px(25), y: px(12) },
      { type: 'plant', x: px(31), y: px(12) },
      { type: 'plant', x: px(46), y: px(12) },
    ],
  };
}

// =====================================================================
// 3) FUTURISTA – startup tipo neón
// =====================================================================
function buildFuturistic(): MapDefinition {
  const W = 70, H = 45;
  const tiles = blank(W, H);
  withBorder(tiles);

  // Lobby central iluminado (carpet)
  rect(tiles, 28, 18, 14, 10, 2);

  // Pods circulares (cuartetos de 4 sillas) con paredes cortas formando arcos
  // Pod NW
  rect(tiles, 6, 6, 10, 8, 2);
  hWall(tiles, 6, 6, 10);
  hWall(tiles, 6, 13, 10);
  vWall(tiles, 6, 6, 8);
  vWall(tiles, 15, 6, 8);
  tiles[10][6] = 0; tiles[10][15] = 0;
  // Pod NE
  rect(tiles, 54, 6, 10, 8, 2);
  hWall(tiles, 54, 6, 10);
  hWall(tiles, 54, 13, 10);
  vWall(tiles, 54, 6, 8);
  vWall(tiles, 63, 6, 8);
  tiles[10][54] = 0; tiles[10][63] = 0;
  // Pod SW
  rect(tiles, 6, 30, 10, 8, 2);
  hWall(tiles, 6, 30, 10);
  hWall(tiles, 6, 37, 10);
  vWall(tiles, 6, 30, 8);
  vWall(tiles, 15, 30, 8);
  tiles[34][6] = 0; tiles[34][15] = 0;
  // Pod SE
  rect(tiles, 54, 30, 10, 8, 2);
  hWall(tiles, 54, 30, 10);
  hWall(tiles, 54, 37, 10);
  vWall(tiles, 54, 30, 8);
  vWall(tiles, 63, 30, 8);
  tiles[34][54] = 0; tiles[34][63] = 0;

  // Stage / pitch zone arriba
  rect(tiles, 25, 3, 20, 6, 3);
  // Demo lab abajo
  rect(tiles, 25, 36, 20, 6, 3);

  // Pasillos de neón (wood color del template hace de glowy floor)
  rect(tiles, 18, 22, 10, 2, 3);
  rect(tiles, 42, 22, 10, 2, 3);
  rect(tiles, 34, 10, 2, 12, 3);
  rect(tiles, 34, 28, 2, 10, 3);

  const chairs = [
    // Lobby central (mesa redonda virtual)
    { id: 'fut_lobby1', x: px(31), y: px(20), facing: 'right' as const },
    { id: 'fut_lobby2', x: px(39), y: px(20), facing: 'left' as const },
    { id: 'fut_lobby3', x: px(31), y: px(26), facing: 'right' as const },
    { id: 'fut_lobby4', x: px(39), y: px(26), facing: 'left' as const },
    { id: 'fut_lobby5', x: px(35), y: px(19), facing: 'down' as const },
    { id: 'fut_lobby6', x: px(35), y: px(27), facing: 'up' as const },
    // Pods
    { id: 'fut_nw1', x: px(8),  y: px(8),  facing: 'down' as const },
    { id: 'fut_nw2', x: px(13), y: px(8),  facing: 'down' as const },
    { id: 'fut_nw3', x: px(8),  y: px(12), facing: 'up' as const },
    { id: 'fut_nw4', x: px(13), y: px(12), facing: 'up' as const },
    { id: 'fut_ne1', x: px(56), y: px(8),  facing: 'down' as const },
    { id: 'fut_ne2', x: px(61), y: px(8),  facing: 'down' as const },
    { id: 'fut_ne3', x: px(56), y: px(12), facing: 'up' as const },
    { id: 'fut_ne4', x: px(61), y: px(12), facing: 'up' as const },
    { id: 'fut_sw1', x: px(8),  y: px(32), facing: 'down' as const },
    { id: 'fut_sw2', x: px(13), y: px(32), facing: 'down' as const },
    { id: 'fut_sw3', x: px(8),  y: px(36), facing: 'up' as const },
    { id: 'fut_sw4', x: px(13), y: px(36), facing: 'up' as const },
    { id: 'fut_se1', x: px(56), y: px(32), facing: 'down' as const },
    { id: 'fut_se2', x: px(61), y: px(32), facing: 'down' as const },
    { id: 'fut_se3', x: px(56), y: px(36), facing: 'up' as const },
    { id: 'fut_se4', x: px(61), y: px(36), facing: 'up' as const },
  ];
  // Pitch stage chairs
  for (let col = 0; col < 8; col++) {
    chairs.push({ id: `fut_pitch_${col}`, x: px(27 + col * 2), y: px(7), facing: 'down' as const });
  }

  return {
    id: 'futuristic',
    name: 'Startup Hub Neón',
    widthTiles: W, heightTiles: H, tileSize: T,
    bgColor: 0x0b1020,
    wallColor: 0x1e293b,
    accentColor: 0x22d3ee,
    tiles,
    spawnX: 35, spawnY: 23,
    teleports: [],
    chairs,
    privateZones: [
      { id: 'lobby',   name: '🌐 Hub Central',  x: 28, y: 18, width: 14, height: 10, color: '#22d3ee' },
      { id: 'pod_nw',  name: 'Pod Producto',    x: 6,  y: 6,  width: 10, height: 8,  color: '#6366f1' },
      { id: 'pod_ne',  name: 'Pod Diseño',      x: 54, y: 6,  width: 10, height: 8,  color: '#a78bfa' },
      { id: 'pod_sw',  name: 'Pod Ingeniería',  x: 6,  y: 30, width: 10, height: 8,  color: '#22d3ee' },
      { id: 'pod_se',  name: 'Pod Ops',         x: 54, y: 30, width: 10, height: 8,  color: '#f472b6' },
      { id: 'pitch',   name: '🚀 Pitch Stage',  x: 25, y: 3,  width: 20, height: 6,  color: '#fbbf24' },
      { id: 'lab',     name: '🧪 Demo Lab',     x: 25, y: 36, width: 20, height: 6,  color: '#10b981' },
    ],
    whiteboards: [
      { id: 'fut_wb_nw', x: px(11), y: px(6) - 4,  width: 96, height: 14 },
      { id: 'fut_wb_ne', x: px(59), y: px(6) - 4,  width: 96, height: 14 },
      { id: 'fut_wb_sw', x: px(11), y: px(30) - 4, width: 96, height: 14 },
      { id: 'fut_wb_se', x: px(59), y: px(30) - 4, width: 96, height: 14 },
    ],
    screens: [
      { id: 'pitch_screen', x: px(35), y: px(3) - 12, width: 256, height: 28, defaultUrl: '' },
      { id: 'lab_screen',   x: px(35), y: px(42) - 4, width: 256, height: 28, defaultUrl: '' },
    ],
    decorations: [
      { type: 'plant', x: px(2),  y: px(2) },
      { type: 'plant', x: px(68), y: px(2) },
      { type: 'plant', x: px(2),  y: px(43) },
      { type: 'plant', x: px(68), y: px(43) },
      { type: 'screen', x: px(35), y: px(5) },
      { type: 'screen', x: px(35), y: px(40) },
    ],
  };
}

// =====================================================================
// EXPORT
// =====================================================================
export const TEMPLATES: Record<string, MapDefinition> = {
  office:     buildOffice(),
  nature:     buildNature(),
  futuristic: buildFuturistic(),
};

export type TemplateId = 'office' | 'nature' | 'futuristic';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  icon: string;
  description: string;
}

export const TEMPLATE_LIST: TemplateMeta[] = [
  { id: 'office',     name: 'Oficina Tradicional', icon: '🏢', description: 'Salas de reunión, open space, coworking y auditorio.' },
  { id: 'nature',     name: 'Refugio Natural',     icon: '🌳', description: 'Cabañas de madera y un parque con bancos, picnic y estanque para los breaks.' },
  { id: 'futuristic', name: 'Startup Hub Neón',    icon: '🚀', description: 'Hub central con 4 pods de equipo, pitch stage y demo lab.' },
];

// Compatibilidad con código existente (MapManager.load lee MAPS).
export const MAPS: Record<string, MapDefinition> = TEMPLATES;
export const WORLD_MAP: MapDefinition = TEMPLATES.office;

// Puntos de viaje rápido — ajustados a la oficina por defecto.
// El cliente debería derivarlos del template activo (ver helpers abajo).
export interface FastTravelPoint {
  id: string;
  name: string;
  icon: string;
  tileX: number;
  tileY: number;
}

export function fastTravelFor(templateId: string): FastTravelPoint[] {
  switch (templateId) {
    case 'nature':
      return [
        { id: 'cabin',  name: 'Cabaña Oficina', icon: '🏡', tileX: 14, tileY: 8 },
        { id: 'cw',     name: 'Coworking',      icon: '💻', tileX: 38, tileY: 8 },
        { id: 'park',   name: 'Parque',         icon: '🌳', tileX: 28, tileY: 33 },
        { id: 'amphi',  name: 'Anfiteatro',     icon: '🎤', tileX: 35, tileY: 41 },
      ];
    case 'futuristic':
      return [
        { id: 'lobby',  name: 'Hub Central',  icon: '🌐', tileX: 35, tileY: 23 },
        { id: 'nw',     name: 'Pod Producto', icon: '💡', tileX: 11, tileY: 10 },
        { id: 'ne',     name: 'Pod Diseño',   icon: '🎨', tileX: 59, tileY: 10 },
        { id: 'sw',     name: 'Pod Ingeniería', icon: '⚙️', tileX: 11, tileY: 34 },
        { id: 'se',     name: 'Pod Ops',      icon: '📈', tileX: 59, tileY: 34 },
        { id: 'pitch',  name: 'Pitch Stage',  icon: '🚀', tileX: 35, tileY: 6 },
        { id: 'lab',    name: 'Demo Lab',     icon: '🧪', tileX: 35, tileY: 39 },
      ];
    case 'office':
    default:
      return [
        { id: 'office',     name: 'Oficina',    icon: '🏢', tileX: 8,  tileY: 16 },
        { id: 'coworking',  name: 'Coworking',  icon: '☕', tileX: 50, tileY: 8  },
        { id: 'auditorium', name: 'Auditorio',  icon: '🎤', tileX: 35, tileY: 30 },
      ];
  }
}

// Compatibilidad antigua (TopBar antes importaba esta lista directamente).
export const FAST_TRAVEL: FastTravelPoint[] = fastTravelFor('office');
