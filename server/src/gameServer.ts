import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Player, Room, ChatMessage, SocketEvents, CONSTANTS, Position,
  AvatarConfig, DEFAULT_AVATAR, PlayerStatus, StickyNote, WhiteboardStroke,
  PlacedFurniture,
} from './types.js';
import { Storage } from './storage.js';

// =====================================================================
// Templates conocidos por el servidor (debe coincidir con el cliente).
// =====================================================================
type TemplateId = 'office' | 'nature' | 'futuristic';

interface FastTravelPoint { id: string; x: number; y: number; }

interface TemplateMeta {
  id: TemplateId;
  name: string;
  spawn: { x: number; y: number };               // tile
  fastTravel: Record<string, FastTravelPoint>;   // por id
}

const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  office: {
    id: 'office',
    name: 'Oficina LimeZu (6 áreas)',
    spawn: { x: 7, y: 12 },
    fastTravel: {
      lounge:  { id: 'lounge',  x: 7,  y: 7  },
      cafe:    { id: 'cafe',    x: 22, y: 7  },
      cowork:  { id: 'cowork',  x: 35, y: 7  },
      gym:     { id: 'gym',     x: 9,  y: 25 },
      audio:   { id: 'audio',   x: 31, y: 23 },
      gallery: { id: 'gallery', x: 18, y: 42 },
    },
  },
  nature: {
    id: 'nature',
    name: 'Refugio Natural',
    spawn: { x: 16, y: 18 },
    fastTravel: {
      cabin: { id: 'cabin', x: 14, y: 8  },
      cw:    { id: 'cw',    x: 38, y: 8  },
      park:  { id: 'park',  x: 28, y: 33 },
      amphi: { id: 'amphi', x: 35, y: 41 },
    },
  },
  futuristic: {
    id: 'futuristic',
    name: 'Startup Hub Neón',
    spawn: { x: 35, y: 23 },
    fastTravel: {
      lobby: { id: 'lobby', x: 35, y: 23 },
      nw:    { id: 'nw',    x: 11, y: 10 },
      ne:    { id: 'ne',    x: 59, y: 10 },
      sw:    { id: 'sw',    x: 11, y: 34 },
      se:    { id: 'se',    x: 59, y: 34 },
      pitch: { id: 'pitch', x: 35, y: 6  },
      lab:   { id: 'lab',   x: 35, y: 39 },
    },
  },
};

// =====================================================================
// Payloads
// =====================================================================
interface CreateRoomPayload {
  playerName: string;
  templateId: TemplateId;
  avatar?: AvatarConfig;
  permanent?: boolean;
  roomName?: string;
}

interface JoinPayload {
  playerName: string;
  roomCode: string;
  avatar?: AvatarConfig;
}

interface PlayerMovePayload extends Position {
  direction?: 'up' | 'down' | 'left' | 'right';
  moving?: boolean;
}

interface PlayerUpdatePayload {
  status?: PlayerStatus;
  micOn?: boolean;
  camOn?: boolean;
  avatar?: AvatarConfig;
  name?: string;
}

/** Estado de una sala (mapa) */
interface RoomState {
  id: string;                    // roomCode (también roomId del cliente)
  templateId: TemplateId;
  name: string;
  spawnX: number;                // px
  spawnY: number;                // px
  chairs: Map<string, string>;   // chairId -> playerId
  stickyNotes: Map<string, StickyNote>;
  whiteboardStrokes: WhiteboardStroke[];
  chatHistory: ChatMessage[];
  currentPlayers: number;
  permanent: boolean;
  ownerName: string;
  whiteboardDirty: boolean;
  furniture: Map<string, PlacedFurniture>;
}

/**
 * Servidor de juego con salas dinámicas con códigos compartibles.
 * Cada sala se asocia a un template (oficina, natural, futurista).
 */
export class GameServer {
  private io: Server;
  private players: Map<string, Player> = new Map();
  private rooms: Map<string, RoomState> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------
  private generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    } while (this.rooms.has(code));
    return code;
  }

  private createRoom(
    templateId: TemplateId,
    opts: { permanent?: boolean; ownerName?: string; name?: string; code?: string } = {}
  ): RoomState {
    const meta = TEMPLATES[templateId] || TEMPLATES.office;
    const code = opts.code || this.generateRoomCode();
    const room: RoomState = {
      id: code,
      templateId: meta.id,
      name: (opts.name || meta.name).slice(0, 60),
      spawnX: meta.spawn.x * CONSTANTS.TILE_SIZE,
      spawnY: meta.spawn.y * CONSTANTS.TILE_SIZE,
      chairs: new Map(),
      stickyNotes: new Map(),
      whiteboardStrokes: [],
      chatHistory: [],
      currentPlayers: 0,
      permanent: !!opts.permanent,
      ownerName: (opts.ownerName || '').slice(0, 30),
      whiteboardDirty: false,
      furniture: new Map(),
    };
    this.rooms.set(code, room);
    if (room.permanent) {
      Storage.saveRoom({
        code: room.id,
        templateId: room.templateId,
        name: room.name,
        ownerName: room.ownerName,
        createdAt: Date.now(),
      }).catch((e: Error) => console.error('saveRoom error:', e.message));
    }
    console.log(`🆕 Sala ${code} (${meta.name})${room.permanent ? ' [PERMANENTE]' : ''} creada`);
    return room;
  }

  /** Carga una sala permanente desde la BD a memoria. */
  private async loadPermanentRoom(code: string): Promise<RoomState | null> {
    const persisted = await Storage.getRoom(code);
    if (!persisted) return null;
    const tplId = (TEMPLATES[persisted.templateId as TemplateId] ? persisted.templateId : 'office') as TemplateId;
    const room = this.createRoom(tplId, {
      permanent: true,
      ownerName: persisted.ownerName,
      name: persisted.name,
      code: persisted.code,
    });
    // Restaurar contenido
    const stickies = await Storage.listStickies(code);
    for (const n of stickies) {
      room.stickyNotes.set(n.id, n);
    }
    room.whiteboardStrokes = await Storage.listStrokes(code);
    const furniture = await Storage.listFurniture(code);
    for (const f of furniture) room.furniture.set(f.id, f);
    console.log(`📂 Sala ${code} restaurada (${room.stickyNotes.size} notas, ${room.whiteboardStrokes.length} trazos, ${room.furniture.size} muebles)`);
    return room;
  }

  // -----------------------------------------------------------------
  // CONNECTION
  // -----------------------------------------------------------------
  handleConnection(socket: Socket) {
    socket.emit(SocketEvents.ROOM_LIST, this.getRooms());

    socket.on(SocketEvents.ROOM_CREATE, (d: CreateRoomPayload) => this.handleRoomCreate(socket, d));
    socket.on(SocketEvents.ROOM_JOIN,   (d: JoinPayload) => this.handleRoomJoin(socket, d));
    socket.on(SocketEvents.PLAYER_MOVE, (p: PlayerMovePayload) => this.handlePlayerMove(socket, p));
    socket.on(SocketEvents.PLAYER_UPDATE, (p: PlayerUpdatePayload) => this.handlePlayerUpdate(socket, p));
    socket.on(SocketEvents.PLAYER_SPEAKING, (s: boolean) => this.handleSpeaking(socket, s));
    socket.on(SocketEvents.PLAYER_EMOTE, (e: string) => this.handleEmote(socket, e));
    socket.on(SocketEvents.CHAT_MESSAGE, (m: string) => this.handleChat(socket, m));
    socket.on(SocketEvents.MAP_CHANGE, (id: string) => this.handleFastTravel(socket, id));

    socket.on(SocketEvents.WEBRTC_OFFER, (d: { to: string; offer: any }) => {
      this.io.to(d.to).emit(SocketEvents.WEBRTC_OFFER, { from: socket.id, offer: d.offer });
    });
    socket.on(SocketEvents.WEBRTC_ANSWER, (d: { to: string; answer: any }) => {
      this.io.to(d.to).emit(SocketEvents.WEBRTC_ANSWER, { from: socket.id, answer: d.answer });
    });
    socket.on(SocketEvents.WEBRTC_ICE_CANDIDATE, (d: { to: string; candidate: any }) => {
      this.io.to(d.to).emit(SocketEvents.WEBRTC_ICE_CANDIDATE, { from: socket.id, candidate: d.candidate });
    });

    socket.on(SocketEvents.CHAIR_SIT, (id: string) => this.handleChairSit(socket, id));
    socket.on(SocketEvents.CHAIR_STAND, () => this.handleChairStand(socket));

    socket.on(SocketEvents.STICKY_CREATE, (n: Partial<StickyNote>) => this.handleStickyCreate(socket, n));
    socket.on(SocketEvents.STICKY_DELETE, (id: string) => this.handleStickyDelete(socket, id));

    socket.on(SocketEvents.FURNITURE_PLACE,  (d: { type: string; x: number; y: number }) => this.handleFurniturePlace(socket, d));
    socket.on(SocketEvents.FURNITURE_MOVE,   (d: { id: string; x: number; y: number })   => this.handleFurnitureMove(socket, d));
    socket.on(SocketEvents.FURNITURE_REMOVE, (id: string) => this.handleFurnitureRemove(socket, id));

    socket.on(SocketEvents.WHITEBOARD_STROKE, (s: WhiteboardStroke) => this.handleWhiteboardStroke(socket, s));
    socket.on(SocketEvents.WHITEBOARD_CLEAR, () => this.handleWhiteboardClear(socket));

    socket.on(SocketEvents.OBJECT_INTERACT, (objectId: string) => {
      const p = this.players.get(socket.id);
      if (!p) return;
      socket.to(p.roomId).emit(SocketEvents.OBJECT_UPDATE, {
        objectId, playerId: p.id, action: 'interact'
      });
    });
  }

  handleDisconnection(socket: Socket) {
    const player = this.players.get(socket.id);
    if (!player) return;
    this.releaseChairOf(socket.id);
    const room = this.rooms.get(player.roomId);
    if (room) {
      room.currentPlayers = Math.max(0, room.currentPlayers - 1);
      if (room.currentPlayers === 0) {
        if (room.permanent) {
          // Persistir snapshot de pizarra (las notas ya se persisten al crear/borrar)
          if (room.whiteboardDirty) {
            Storage.replaceStrokes(room.id, room.whiteboardStrokes)
              .catch((e: Error) => console.error('replaceStrokes error:', e.message));
            room.whiteboardDirty = false;
          }
          this.rooms.delete(room.id);
          console.log(`💾 Sala ${room.id} descargada de memoria (persiste en BD)`);
        } else {
          this.rooms.delete(room.id);
          console.log(`🗑️  Sala ${room.id} eliminada (vacía, efímera)`);
        }
      }
    }
    this.io.to(player.roomId).emit(SocketEvents.PLAYER_LEAVE, socket.id);
    this.players.delete(socket.id);
    console.log(`👋 ${player.name} salió`);
  }

  // -----------------------------------------------------------------
  // ROOM CREATE / JOIN
  // -----------------------------------------------------------------
  private handleRoomCreate(socket: Socket, data: CreateRoomPayload) {
    const tplId: TemplateId = (TEMPLATES[data.templateId] ? data.templateId : 'office');
    const room = this.createRoom(tplId, {
      permanent: !!data.permanent,
      ownerName: data.playerName,
      name: data.roomName,
    });
    this.placePlayerInRoom(socket, room, data.playerName, data.avatar);
  }

  private async handleRoomJoin(socket: Socket, data: JoinPayload) {
    const code = (data.roomCode || '').toUpperCase().trim();
    if (!code) {
      socket.emit(SocketEvents.ROOM_ERROR, { code: 'EMPTY_CODE', message: 'Ingresa un código de sala' });
      return;
    }
    let room = this.rooms.get(code);
    if (!room) {
      // Intentar cargar desde almacenamiento permanente
      room = (await this.loadPermanentRoom(code)) || undefined;
    }
    if (!room) {
      socket.emit(SocketEvents.ROOM_ERROR, { code: 'NOT_FOUND', message: `No existe la sala "${code}"` });
      return;
    }
    if (room.currentPlayers >= CONSTANTS.MAX_PLAYERS_PER_ROOM) {
      socket.emit(SocketEvents.ROOM_ERROR, { code: 'FULL', message: 'La sala está llena' });
      return;
    }
    this.placePlayerInRoom(socket, room, data.playerName, data.avatar);
  }

  private placePlayerInRoom(socket: Socket, room: RoomState, playerName: string, avatar?: AvatarConfig) {
    const player: Player = {
      id: socket.id,
      name: (playerName || 'Anon').slice(0, 20),
      x: room.spawnX + (Math.random() - 0.5) * 80,
      y: room.spawnY + (Math.random() - 0.5) * 80,
      direction: 'down',
      moving: false,
      roomId: room.id,
      mapId: room.templateId,
      avatar: { ...DEFAULT_AVATAR, ...(avatar || {}) },
      status: 'online',
      micOn: false,
      camOn: false,
      speaking: false,
    };

    this.players.set(socket.id, player);
    room.currentPlayers++;
    socket.join(room.id);

    const playersInRoom = Array.from(this.players.values()).filter(p => p.roomId === room.id);

    socket.emit(SocketEvents.ROOM_JOINED, {
      roomCode:   room.id,
      templateId: room.templateId,
      name:       room.name,
      spawnX:     player.x,
      spawnY:     player.y,
      ownerName:  room.ownerName,
      permanent:  room.permanent,
    });
    socket.emit(SocketEvents.PLAYERS_LIST, playersInRoom);
    socket.emit(SocketEvents.CHAT_HISTORY, room.chatHistory);
    socket.emit(SocketEvents.STICKY_LIST, Array.from(room.stickyNotes.values()));
    socket.emit(SocketEvents.WHITEBOARD_HISTORY, room.whiteboardStrokes);
    socket.emit(SocketEvents.FURNITURE_LIST, Array.from(room.furniture.values()));

    socket.to(room.id).emit(SocketEvents.PLAYER_JOIN, player);
    console.log(`✅ ${player.name} entró a ${room.id} [${room.templateId}] (${playersInRoom.length})`);
  }

  /** Viaje rápido dentro de la misma sala (teleport por nombre de zona). */
  private handleFastTravel(socket: Socket, targetId: string) {
    const player = this.players.get(socket.id);
    if (!player) return;
    const room = this.rooms.get(player.roomId);
    if (!room) return;
    const meta = TEMPLATES[room.templateId];
    const tp = meta?.fastTravel?.[targetId];
    if (!tp) return;

    this.releaseChairOf(socket.id);
    player.x = tp.x * CONSTANTS.TILE_SIZE + (Math.random() - 0.5) * 40;
    player.y = tp.y * CONSTANTS.TILE_SIZE + (Math.random() - 0.5) * 40;
    player.sittingOn = undefined;

    socket.emit(SocketEvents.MAP_CHANGE, { mapId: room.templateId, spawnX: player.x, spawnY: player.y });
    this.io.to(player.roomId).emit(SocketEvents.PLAYER_MOVE, {
      id: player.id, x: player.x, y: player.y, direction: player.direction, moving: false,
    });
  }

  // -----------------------------------------------------------------
  // PLAYER UPDATES
  // -----------------------------------------------------------------
  private handlePlayerMove(socket: Socket, payload: PlayerMovePayload) {
    const player = this.players.get(socket.id);
    if (!player) return;
    if (player.sittingOn) return;
    player.x = payload.x;
    player.y = payload.y;
    if (payload.direction) player.direction = payload.direction;
    if (typeof payload.moving === 'boolean') player.moving = payload.moving;

    socket.to(player.roomId).emit(SocketEvents.PLAYER_MOVE, {
      id: socket.id, x: player.x, y: player.y, direction: player.direction, moving: player.moving,
    });
    this.updateProximity(socket, player);
  }

  private handlePlayerUpdate(socket: Socket, payload: PlayerUpdatePayload) {
    const p = this.players.get(socket.id);
    if (!p) return;
    if (payload.status) p.status = payload.status;
    if (typeof payload.micOn === 'boolean') p.micOn = payload.micOn;
    if (typeof payload.camOn === 'boolean') p.camOn = payload.camOn;
    if (payload.avatar) p.avatar = payload.avatar;
    if (payload.name) p.name = payload.name.slice(0, 20);
    this.io.to(p.roomId).emit(SocketEvents.PLAYER_UPDATE, {
      id: p.id, status: p.status, micOn: p.micOn, camOn: p.camOn, avatar: p.avatar, name: p.name,
    });
  }

  private handleSpeaking(socket: Socket, speaking: boolean) {
    const p = this.players.get(socket.id);
    if (!p || p.speaking === speaking) return;
    p.speaking = speaking;
    socket.to(p.roomId).emit(SocketEvents.PLAYER_SPEAKING, { id: p.id, speaking });
  }

  private handleEmote(socket: Socket, emote: string) {
    const p = this.players.get(socket.id);
    if (!p) return;
    this.io.to(p.roomId).emit(SocketEvents.PLAYER_EMOTE, { id: p.id, emote });
  }

  // -----------------------------------------------------------------
  // PROXIMITY
  // -----------------------------------------------------------------
  private updateProximity(socket: Socket, player: Player) {
    const others = Array.from(this.players.values())
      .filter(p => p.roomId === player.roomId && p.id !== player.id);
    const nearby = others.filter(p => {
      if (p.inPrivateZone && p.inPrivateZone !== player.inPrivateZone) return false;
      if (player.inPrivateZone && p.inPrivateZone !== player.inPrivateZone) return false;
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      return Math.sqrt(dx*dx + dy*dy) <= CONSTANTS.PROXIMITY_RADIUS;
    });
    socket.emit(SocketEvents.WEBRTC_PROXIMITY_UPDATE,
      nearby.slice(0, CONSTANTS.MAX_WEBRTC_PEERS).map(p => p.id));
  }

  // -----------------------------------------------------------------
  // CHAT
  // -----------------------------------------------------------------
  private handleChat(socket: Socket, message: string) {
    const player = this.players.get(socket.id);
    if (!player) return;
    const text = (message || '').toString().slice(0, 500).trim();
    if (!text) return;
    const room = this.rooms.get(player.roomId);
    if (!room) return;
    const cm: ChatMessage = {
      id: uuidv4(),
      playerId: player.id,
      playerName: player.name,
      message: text,
      timestamp: Date.now(),
      roomId: player.roomId,
      channel: 'room',
    };
    room.chatHistory.push(cm);
    if (room.chatHistory.length > 200) room.chatHistory.shift();
    this.io.to(player.roomId).emit(SocketEvents.CHAT_MESSAGE, cm);
  }

  // -----------------------------------------------------------------
  // CHAIRS
  // -----------------------------------------------------------------
  private handleChairSit(socket: Socket, chairId: string) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    const occupant = room.chairs.get(chairId);
    if (occupant && occupant !== p.id) return;
    room.chairs.set(chairId, p.id);
    p.sittingOn = chairId;
    this.io.to(p.roomId).emit(SocketEvents.CHAIR_SIT, { chairId, playerId: p.id });
  }

  private handleChairStand(socket: Socket) { this.releaseChairOf(socket.id); }

  private releaseChairOf(playerId: string) {
    const p = this.players.get(playerId);
    if (!p || !p.sittingOn) return;
    const room = this.rooms.get(p.roomId);
    if (room) room.chairs.delete(p.sittingOn);
    const chairId = p.sittingOn;
    p.sittingOn = undefined;
    this.io.to(p.roomId).emit(SocketEvents.CHAIR_STAND, { chairId, playerId: p.id });
  }

  // -----------------------------------------------------------------
  // STICKY NOTES
  // -----------------------------------------------------------------
  private handleStickyCreate(socket: Socket, partial: Partial<StickyNote>) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room || room.stickyNotes.size >= 200) return;
    const note: StickyNote = {
      id: uuidv4(),
      authorId: p.id,
      authorName: p.name,
      text: (partial.text || '').toString().slice(0, 240),
      color: partial.color || '#fef08a',
      x: typeof partial.x === 'number' ? partial.x : p.x,
      y: typeof partial.y === 'number' ? partial.y : p.y,
      mapId: p.mapId,
      createdAt: Date.now(),
    };
    room.stickyNotes.set(note.id, note);
    if (room.permanent) Storage.saveSticky(room.id, note).catch((e: Error) => console.error('saveSticky:', e.message));
    this.io.to(p.roomId).emit(SocketEvents.STICKY_CREATE, note);
  }

  private handleStickyDelete(socket: Socket, id: string) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    const note = room.stickyNotes.get(id);
    if (!note || note.authorId !== p.id) return;
    room.stickyNotes.delete(id);
    if (room.permanent) Storage.deleteSticky(id).catch((e: Error) => console.error('deleteSticky:', e.message));
    this.io.to(p.roomId).emit(SocketEvents.STICKY_DELETE, id);
  }

  // -----------------------------------------------------------------
  // WHITEBOARD
  // -----------------------------------------------------------------
  private handleWhiteboardStroke(socket: Socket, stroke: WhiteboardStroke) {
    const p = this.players.get(socket.id);
    if (!p || !stroke || !Array.isArray(stroke.points)) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    stroke.authorId = p.id;
    stroke.id = stroke.id || uuidv4();
    room.whiteboardStrokes.push(stroke);
    if (room.whiteboardStrokes.length > 5000) room.whiteboardStrokes.shift();
    if (room.permanent) room.whiteboardDirty = true;
    socket.to(p.roomId).emit(SocketEvents.WHITEBOARD_STROKE, stroke);
  }

  private handleWhiteboardClear(socket: Socket) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    room.whiteboardStrokes = [];
    if (room.permanent) {
      Storage.replaceStrokes(room.id, [])
        .catch((e: Error) => console.error('replaceStrokes clear:', e.message));
      room.whiteboardDirty = false;
    }
    this.io.to(p.roomId).emit(SocketEvents.WHITEBOARD_CLEAR);
  }

  // -----------------------------------------------------------------
  // FURNITURE (mobiliario colocado por el creador)
  // -----------------------------------------------------------------
  /**
   * Solo el creador del espacio (en salas permanentes) o cualquier persona
   * en una sala efímera puede editar el mobiliario.
   */
  private canEditFurniture(player: Player, room: RoomState): boolean {
    if (!room.permanent) return true;
    return (player.name || '').trim().toLowerCase()
        === (room.ownerName || '').trim().toLowerCase();
  }

  private handleFurniturePlace(socket: Socket, data: { type: string; x: number; y: number }) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    if (!this.canEditFurniture(p, room)) return;
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;
    const type = String(data.type || '').slice(0, 30);
    if (!type) return;
    if (room.furniture.size >= 200) return; // límite anti-abuso
    const item: PlacedFurniture = { id: uuidv4(), type, x: data.x, y: data.y };
    room.furniture.set(item.id, item);
    if (room.permanent) {
      Storage.saveFurniture(room.id, item)
        .catch((e: Error) => console.error('saveFurniture:', e.message));
    }
    this.io.to(room.id).emit(SocketEvents.FURNITURE_PLACE, item);
  }

  private handleFurnitureMove(socket: Socket, data: { id: string; x: number; y: number }) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    if (!this.canEditFurniture(p, room)) return;
    const item = room.furniture.get(data.id);
    if (!item) return;
    item.x = data.x;
    item.y = data.y;
    if (room.permanent) {
      Storage.saveFurniture(room.id, item)
        .catch((e: Error) => console.error('saveFurniture (move):', e.message));
    }
    this.io.to(room.id).emit(SocketEvents.FURNITURE_MOVE, { id: item.id, x: item.x, y: item.y });
  }

  private handleFurnitureRemove(socket: Socket, id: string) {
    const p = this.players.get(socket.id);
    if (!p) return;
    const room = this.rooms.get(p.roomId);
    if (!room) return;
    if (!this.canEditFurniture(p, room)) return;
    if (!room.furniture.has(id)) return;
    room.furniture.delete(id);
    if (room.permanent) {
      Storage.deleteFurniture(id)
        .catch((e: Error) => console.error('deleteFurniture:', e.message));
    }
    this.io.to(room.id).emit(SocketEvents.FURNITURE_REMOVE, id);
  }

  // -----------------------------------------------------------------
  // PUBLIC
  // -----------------------------------------------------------------
  getRooms(): Room[] {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      maxPlayers: CONSTANTS.MAX_PLAYERS_PER_ROOM,
      currentPlayers: r.currentPlayers,
      mapId: r.templateId,
    }));
  }

  /**
   * Descarga una sala permanente de memoria. Devuelve { ok:false, reason:'IN_USE' }
   * si todavía hay jugadores conectados (no se permite eliminar mientras se use).
   */
  dropPermanentRoom(code: string): { ok: boolean; reason?: string } {
    const room = this.rooms.get(code);
    if (room && room.currentPlayers > 0) {
      return { ok: false, reason: 'IN_USE' };
    }
    this.rooms.delete(code);
    return { ok: true };
  }

  getStats() {
    return {
      players: this.players.size,
      rooms: this.getRooms().map(r => ({ id: r.id, name: r.name, players: r.currentPlayers })),
    };
  }
}
