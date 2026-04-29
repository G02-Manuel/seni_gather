import { io, Socket } from 'socket.io-client';
import {
  Player, ChatMessage, SocketEvents, Position, Room,
  AvatarConfig, PlayerStatus, StickyNote, WhiteboardStroke,
} from '../types';

type Listener<T = any> = (payload: T) => void;

/**
 * Wrapper de Socket.io con API tipada. Todos los handlers se registran una
 * sola vez aunque la conexión se reinicie.
 */
export class SocketManager {
  private socket: Socket | null = null;
  private serverUrl: string;
  private listeners: Map<string, Listener[]> = new Map();

  constructor(serverUrl?: string) {
    const envUrl = process.env.REACT_APP_SERVER_URL as string | undefined;
    // En producción, si no se define la URL, usar el mismo origen (servidor sirve frontend).
    const sameOrigin =
      typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? window.location.origin
        : 'http://localhost:3001';
    this.serverUrl = serverUrl || envUrl || sameOrigin;
  }

  // -----------------------------------------------------------------
  // CONNECTION
  // -----------------------------------------------------------------
  /** Conecta al servidor sin unirse a ninguna sala. */
  connect() {
    if (this.socket) return;
    this.socket = io(this.serverUrl, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => console.log('✅ Conectado:', this.socket?.id));
    this.socket.on('disconnect', () => console.log('❌ Desconectado'));
    this.socket.on('error', (e: { message: string }) => console.error('Server error', e));

    // Re-aplicar listeners almacenados
    for (const [event, fns] of this.listeners) {
      for (const fn of fns) this.socket.on(event, fn);
    }
  }

  /** Crea una nueva sala con el template indicado y entra. */
  createRoom(playerName: string, templateId: string, avatar?: AvatarConfig) {
    const send = () => this.socket?.emit(SocketEvents.ROOM_CREATE, { playerName, templateId, avatar });
    if (this.socket?.connected) send();
    else this.socket?.once('connect', send);
  }

  /** Entra a una sala existente por código. */
  joinByCode(playerName: string, roomCode: string, avatar?: AvatarConfig) {
    const code = (roomCode || '').toUpperCase().trim();
    const send = () => this.socket?.emit(SocketEvents.ROOM_JOIN, { playerName, roomCode: code, avatar });
    if (this.socket?.connected) send();
    else this.socket?.once('connect', send);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocketId(): string | undefined { return this.socket?.id; }
  isConnected(): boolean { return !!this.socket?.connected; }

  // -----------------------------------------------------------------
  // GENERIC ON/OFF
  // -----------------------------------------------------------------
  on<T = any>(event: string, fn: Listener<T>) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn);
    this.socket?.on(event, fn as any);
  }
  off(event: string, fn?: Listener) {
    const arr = this.listeners.get(event);
    if (arr && fn) this.listeners.set(event, arr.filter(f => f !== fn));
    if (fn) this.socket?.off(event, fn as any);
    else this.socket?.off(event);
  }
  emit(event: string, payload?: any) { this.socket?.emit(event, payload); }

  // -----------------------------------------------------------------
  // PLAYER
  // -----------------------------------------------------------------
  sendPlayerMove(p: Position & { direction?: string; moving?: boolean }) {
    this.socket?.emit(SocketEvents.PLAYER_MOVE, p);
  }
  sendPlayerUpdate(u: Partial<{ status: PlayerStatus; micOn: boolean; camOn: boolean; avatar: AvatarConfig; name: string }>) {
    this.socket?.emit(SocketEvents.PLAYER_UPDATE, u);
  }
  sendSpeaking(speaking: boolean) { this.socket?.emit(SocketEvents.PLAYER_SPEAKING, speaking); }
  sendEmote(emote: string) { this.socket?.emit(SocketEvents.PLAYER_EMOTE, emote); }

  onPlayerJoin(cb: Listener<Player>) { this.on(SocketEvents.PLAYER_JOIN, cb); }
  onPlayerLeave(cb: Listener<string>) { this.on(SocketEvents.PLAYER_LEAVE, cb); }
  onPlayerMove(cb: Listener<{ id: string; x: number; y: number; direction: string; moving: boolean }>) {
    this.on(SocketEvents.PLAYER_MOVE, cb);
  }
  onPlayerUpdate(cb: Listener<Partial<Player> & { id: string }>) { this.on(SocketEvents.PLAYER_UPDATE, cb); }
  onPlayerSpeaking(cb: Listener<{ id: string; speaking: boolean }>) { this.on(SocketEvents.PLAYER_SPEAKING, cb); }
  onPlayerEmote(cb: Listener<{ id: string; emote: string }>) { this.on(SocketEvents.PLAYER_EMOTE, cb); }
  onPlayersList(cb: Listener<Player[]>) { this.on(SocketEvents.PLAYERS_LIST, cb); }
  onMapChange(cb: Listener<{ mapId: string; spawnX: number; spawnY: number }>) {
    this.on(SocketEvents.MAP_CHANGE, cb);
  }

  changeMap(mapId: string) { this.socket?.emit(SocketEvents.MAP_CHANGE, mapId); }
  onRoomList(cb: Listener<Room[]>) { this.on(SocketEvents.ROOM_LIST, cb); }

  onRoomJoined(cb: Listener<{ roomCode: string; templateId: string; name: string; spawnX: number; spawnY: number }>) {
    this.on(SocketEvents.ROOM_JOINED, cb);
  }
  onRoomError(cb: Listener<{ code: string; message: string }>) {
    this.on(SocketEvents.ROOM_ERROR, cb);
  }

  // -----------------------------------------------------------------
  // CHAT
  // -----------------------------------------------------------------
  sendChatMessage(msg: string) { this.socket?.emit(SocketEvents.CHAT_MESSAGE, msg); }
  onChatMessage(cb: Listener<ChatMessage>) { this.on(SocketEvents.CHAT_MESSAGE, cb); }
  onChatHistory(cb: Listener<ChatMessage[]>) { this.on(SocketEvents.CHAT_HISTORY, cb); }

  // -----------------------------------------------------------------
  // WEBRTC
  // -----------------------------------------------------------------
  sendOffer(to: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit(SocketEvents.WEBRTC_OFFER, { to, offer });
  }
  sendAnswer(to: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit(SocketEvents.WEBRTC_ANSWER, { to, answer });
  }
  sendIce(to: string, candidate: RTCIceCandidate) {
    this.socket?.emit(SocketEvents.WEBRTC_ICE_CANDIDATE, { to, candidate });
  }
  onOffer(cb: Listener<{ from: string; offer: RTCSessionDescriptionInit }>) {
    this.on(SocketEvents.WEBRTC_OFFER, cb);
  }
  onAnswer(cb: Listener<{ from: string; answer: RTCSessionDescriptionInit }>) {
    this.on(SocketEvents.WEBRTC_ANSWER, cb);
  }
  onIce(cb: Listener<{ from: string; candidate: RTCIceCandidate }>) {
    this.on(SocketEvents.WEBRTC_ICE_CANDIDATE, cb);
  }
  onProximity(cb: Listener<string[]>) { this.on(SocketEvents.WEBRTC_PROXIMITY_UPDATE, cb); }

  // -----------------------------------------------------------------
  // CHAIRS
  // -----------------------------------------------------------------
  sit(chairId: string) { this.socket?.emit(SocketEvents.CHAIR_SIT, chairId); }
  stand() { this.socket?.emit(SocketEvents.CHAIR_STAND); }
  onChairSit(cb: Listener<{ chairId: string; playerId: string }>) { this.on(SocketEvents.CHAIR_SIT, cb); }
  onChairStand(cb: Listener<{ chairId: string; playerId: string }>) { this.on(SocketEvents.CHAIR_STAND, cb); }

  // -----------------------------------------------------------------
  // STICKY NOTES
  // -----------------------------------------------------------------
  createSticky(n: { text: string; color: string; x: number; y: number }) {
    this.socket?.emit(SocketEvents.STICKY_CREATE, n);
  }
  deleteSticky(id: string) { this.socket?.emit(SocketEvents.STICKY_DELETE, id); }
  onStickyList(cb: Listener<StickyNote[]>) { this.on(SocketEvents.STICKY_LIST, cb); }
  onStickyCreate(cb: Listener<StickyNote>) { this.on(SocketEvents.STICKY_CREATE, cb); }
  onStickyDelete(cb: Listener<string>) { this.on(SocketEvents.STICKY_DELETE, cb); }

  // -----------------------------------------------------------------
  // WHITEBOARD
  // -----------------------------------------------------------------
  sendStroke(s: WhiteboardStroke) { this.socket?.emit(SocketEvents.WHITEBOARD_STROKE, s); }
  clearWhiteboard() { this.socket?.emit(SocketEvents.WHITEBOARD_CLEAR); }
  onStroke(cb: Listener<WhiteboardStroke>) { this.on(SocketEvents.WHITEBOARD_STROKE, cb); }
  onWhiteboardHistory(cb: Listener<WhiteboardStroke[]>) { this.on(SocketEvents.WHITEBOARD_HISTORY, cb); }
  onWhiteboardClear(cb: Listener<void>) { this.on(SocketEvents.WHITEBOARD_CLEAR, cb); }
}
