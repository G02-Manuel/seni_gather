// =====================================================================
// Tipos compartidos entre cliente y servidor (Orbitra)
// =====================================================================

export type Direction = 'up' | 'down' | 'left' | 'right';
export type PlayerStatus = 'online' | 'away' | 'busy' | 'dnd';

// ----- Avatar customization ------------------------------------------
export interface AvatarConfig {
  skin: number;        // 0..5
  hair: number;        // 0..9
  hairColor: number;   // 0..7
  outfit: number;      // 0..7
  outfitColor: number; // 0..7
  accessory: number;   // 0..4 (0 = ninguno)
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 1,
  hair: 0,
  hairColor: 0,
  outfit: 0,
  outfitColor: 0,
  accessory: 0,
};

// ----- Player ---------------------------------------------------------
export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  moving: boolean;
  roomId: string;
  mapId: string;
  avatar: AvatarConfig;
  status: PlayerStatus;
  micOn: boolean;
  camOn: boolean;
  speaking: boolean;
  sittingOn?: string;
  inPrivateZone?: string;
}

// ----- Room -----------------------------------------------------------
export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  mapId: string;
}

export interface Position {
  x: number;
  y: number;
}

// ----- Chat -----------------------------------------------------------
export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
  roomId: string;
  channel?: string;
}

// ----- Sticky notes ---------------------------------------------------
export interface StickyNote {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  color: string;
  x: number;
  y: number;
  mapId: string;
  createdAt: number;
}

// ----- Whiteboard -----------------------------------------------------
export interface WhiteboardStroke {
  id: string;
  authorId: string;
  color: string;
  size: number;
  points: { x: number; y: number }[];
}

// ----- Map definitions ------------------------------------------------
export interface MapTeleport {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  toMapId: string;
  spawnX: number;
  spawnY: number;
  label: string;
}

export interface MapChair {
  id: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface MapPrivateZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface MapWhiteboard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapScreen {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  defaultUrl?: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  bgColor: number;
  wallColor: number;
  accentColor: number;
  /** [y][x]  0=floor, 1=wall, 2=carpet, 3=wood, 4=glass */
  tiles: number[][];
  spawnX: number;
  spawnY: number;
  teleports: MapTeleport[];
  chairs: MapChair[];
  privateZones: MapPrivateZone[];
  whiteboards: MapWhiteboard[];
  screens: MapScreen[];
  decorations: { type: string; x: number; y: number }[];
}

// ----- Eventos Socket.io ---------------------------------------------
export enum SocketEvents {
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',

  PLAYER_JOIN = 'player:join',
  PLAYER_LEAVE = 'player:leave',
  PLAYER_MOVE = 'player:move',
  PLAYER_UPDATE = 'player:update',
  PLAYER_SPEAKING = 'player:speaking',
  PLAYER_EMOTE = 'player:emote',
  PLAYERS_LIST = 'players:list',

  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_LIST = 'room:list',
  MAP_CHANGE = 'map:change',

  CHAT_MESSAGE = 'chat:message',
  CHAT_HISTORY = 'chat:history',

  WEBRTC_OFFER = 'webrtc:offer',
  WEBRTC_ANSWER = 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE = 'webrtc:ice-candidate',
  WEBRTC_PROXIMITY_UPDATE = 'webrtc:proximity',

  OBJECT_INTERACT = 'object:interact',
  OBJECT_UPDATE = 'object:update',
  CHAIR_SIT = 'chair:sit',
  CHAIR_STAND = 'chair:stand',

  STICKY_LIST = 'sticky:list',
  STICKY_CREATE = 'sticky:create',
  STICKY_DELETE = 'sticky:delete',

  WHITEBOARD_STROKE = 'whiteboard:stroke',
  WHITEBOARD_HISTORY = 'whiteboard:history',
  WHITEBOARD_CLEAR = 'whiteboard:clear',
}

// ----- Constantes -----------------------------------------------------
export const CONSTANTS = {
  PROXIMITY_RADIUS: 200,
  PROXIMITY_FALLOFF: 0.5,
  MAX_WEBRTC_PEERS: 8,
  MAX_PLAYERS_PER_ROOM: 50,
  PLAYER_SPEED: 180,
  TILE_SIZE: 32,
  MOVE_THROTTLE_MS: 50,
  PLAYER_SIZE: 32,
  AVATAR_FRAME_W: 32,
  AVATAR_FRAME_H: 48,
  // Mantener compatibilidad con código antiguo
  DEFAULT_MAP_WIDTH: 25,
  DEFAULT_MAP_HEIGHT: 20,
};

export const SKIN_PALETTE = [
  0xffe0bd, 0xffcd94, 0xeac086, 0xc68642, 0x8d5524, 0x4b2e1f,
];
export const HAIR_PALETTE = [
  0x2c1810, 0x6b4423, 0xc69c6d, 0xf1c40f,
  0xe74c3c, 0x9b59b6, 0x3498db, 0xecf0f1,
];
export const OUTFIT_PALETTE = [
  0x3498db, 0xe74c3c, 0x2ecc71, 0x9b59b6,
  0xf39c12, 0x1abc9c, 0x34495e, 0xe91e63,
];

export const STATUS_COLORS: Record<PlayerStatus, string> = {
  online: '#4ade80',
  away: '#facc15',
  busy: '#f97316',
  dnd: '#ef4444',
};

export const STATUS_LABELS: Record<PlayerStatus, string> = {
  online: 'En línea',
  away: 'Ausente',
  busy: 'Ocupado',
  dnd: 'No molestar',
};

export const EMOTES = ['👋','👍','👏','❤️','😂','😮','🎉','🤔','💯','🔥','✨','🙌','👀','☕','🍕','🚀','😴','🤝','💡','🙏'];

export const STICKY_COLORS = ['#fef08a', '#fda4af', '#86efac', '#93c5fd', '#c4b5fd', '#fdba74'];
