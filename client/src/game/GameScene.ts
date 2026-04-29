import Phaser from 'phaser';
import { SocketManager } from '../services/SocketManager';
import { WebRTCManager } from '../services/WebRTCManager';
import { AudioManager } from '../services/AudioManager';
import {
  Player as PlayerData, AvatarConfig, Direction, CONSTANTS, StickyNote,
} from '../types';
import { MapManager } from './managers/MapManager';
import { PlayerEntity } from './entities/PlayerEntity';
import { SpriteFactory } from './utils/SpriteFactory';
import { TemplateId } from './utils/MapDefinitions';

export interface GameSceneCallbacks {
  onLocalPlayerReady?: (id: string) => void;
  onPlayersUpdated?: (players: PlayerData[]) => void;
  onMapChanged?: (mapId: string) => void;
  onWhiteboardOpen?: (id: string) => void;
  onScreenOpen?: (id: string) => void;
  onMinimapReady?: (img: string) => void;
  onPlayerPositions?: (positions: { id: string; x: number; y: number; isLocal: boolean }[]) => void;
  onProximityDistances?: (dist: Map<string, number>) => void;
  /** Llamado al final de create(): la escena está lista para recibir eventos del socket. */
  onSceneReady?: () => void;
}

/**
 * Escena principal de Phaser. Orquesta:
 *   - mapas (MapManager)
 *   - sprites animados (SpriteFactory + PlayerEntity)
 *   - input (WASD + flechas + click-to-move + interacciones)
 *   - sticky notes y emotes
 *   - integración con SocketManager y WebRTCManager
 */
export class GameScene extends Phaser.Scene {
  private socket?: SocketManager;
  private rtc?: WebRTCManager;
  private audio?: AudioManager;
  private callbacks: GameSceneCallbacks = {};

  private mapManager!: MapManager;
  private localPlayer?: PlayerEntity;
  private remote: Map<string, PlayerEntity> = new Map();
  private localData?: PlayerData;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private interactKey?: Phaser.Input.Keyboard.Key;
  private noteKey?: Phaser.Input.Keyboard.Key;

  private proximityCircle?: Phaser.GameObjects.Graphics;
  private clickTarget?: { x: number; y: number };
  private clickMarker?: Phaser.GameObjects.Graphics;

  private lastSendTs = 0;
  private lastDirection: Direction = 'down';
  private lastMoving = false;

  private avatarConfig?: AvatarConfig;
  private playerName = 'Anon';
  private templateId: TemplateId = 'office';

  // Sticky notes visuales
  private stickyContainers: Map<string, Phaser.GameObjects.Container> = new Map();

  // -----------------------------------------------------------------
  // EDIT MODE (mobiliario)
  // -----------------------------------------------------------------
  private editMode = false;
  private selectedFurnitureType: string | null = null;
  private ghost?: Phaser.GameObjects.Container;
  private lastFurnitureMoveTs = 0;

  private created = false;

  constructor() { super({ key: 'GameScene' }); }

  init(data: { name?: string; avatar?: AvatarConfig; templateId?: TemplateId; callbacks?: GameSceneCallbacks }) {
    this.playerName = data.name || 'Anon';
    this.avatarConfig = data.avatar;
    if (data.templateId) this.templateId = data.templateId;
    this.callbacks = data.callbacks || {};
  }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  create() {
    this.mapManager = new MapManager(this);
    // Carga el template seleccionado para esta sala.
    const def = this.mapManager.load(this.templateId);
    this.callbacks.onMinimapReady?.(this.mapManager.minimapImage || '');

    // Input
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.noteKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.N);

    // Click to move + interacción
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, objs: Phaser.GameObjects.GameObject[]) => {
      const obj: any = objs[0];
      if (obj?.getData) {
        const kind = obj.getData('kind');

        // ---- Modo edición: click sobre mueble lo elimina ----
        if (kind === 'furniture' && this.editMode) {
          const id = obj.getData('furnitureId');
          if (id) this.socket?.removeFurniture(id);
          return;
        }

        if (kind === 'chair') {
          const id = obj.getData('chairId');
          this.requestSit(id);
          return;
        }
        if (kind === 'whiteboard') {
          this.callbacks.onWhiteboardOpen?.(obj.getData('whiteboardId'));
          return;
        }
        if (kind === 'screen') {
          this.callbacks.onScreenOpen?.(obj.getData('screenId'));
          return;
        }
      }
      const wp = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;

      // ---- Modo edición: click en suelo coloca el tipo seleccionado ----
      if (this.editMode && this.selectedFurnitureType) {
        if (this.mapManager.collidesAt(wp.x, wp.y)) return;
        this.socket?.placeFurniture(this.selectedFurnitureType, wp.x, wp.y);
        return;
      }

      this.clickTarget = { x: wp.x, y: wp.y };
      this.drawClickMarker(wp.x, wp.y);
      // Standup si estabas sentado
      if (this.localData?.sittingOn) {
        this.socket?.stand();
        this.localData.sittingOn = undefined;
      }
    });

    // Drag de muebles colocados (modo edición)
    this.input.on('drag', (_pointer: Phaser.Input.Pointer, obj: any, dragX: number, dragY: number) => {
      if (!this.editMode) return;
      if (!obj?.getData || obj.getData('kind') !== 'furniture') return;
      obj.setPosition(dragX, dragY);
      const id = obj.getData('furnitureId');
      const now = performance.now();
      if (id && now - this.lastFurnitureMoveTs > 60) {
        this.lastFurnitureMoveTs = now;
        this.socket?.moveFurniture(id, dragX, dragY);
      }
    });
    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, obj: any) => {
      if (!this.editMode) return;
      if (!obj?.getData || obj.getData('kind') !== 'furniture') return;
      const id = obj.getData('furnitureId');
      if (id) this.socket?.moveFurniture(id, obj.x, obj.y);
    });

    // Resize
    this.scale.on('resize', (gs: Phaser.Structs.Size) => {
      this.cameras.main.setSize(gs.width, gs.height);
      if (this.mapManager.current && this.localData) {
        this.applyMapCamera(this.mapManager.current, this.localData.x, this.localData.y);
      }
    });

    // Proximidad visual
    this.proximityCircle = this.add.graphics();
    this.proximityCircle.lineStyle(2, 0x4ade80, 0.25);
    this.proximityCircle.strokeCircle(0, 0, CONSTANTS.PROXIMITY_RADIUS);
    this.proximityCircle.setDepth(50);

    this.cameras.main.setBackgroundColor(def.bgColor);
    // Bounds y centro inicial de cámara (antes de que llegue el jugador local)
    this.applyMapCamera(def, def.spawnX * def.tileSize, def.spawnY * def.tileSize);

    this.created = true;
    // Si los managers ya estaban inyectados antes de create(), conectar ahora.
    if (this.socket && !this.boundSocket) this.bindSocket();
    // Notificar al exterior que la escena ya puede recibir eventos del socket.
    this.callbacks.onSceneReady?.();
  }

  // -----------------------------------------------------------------
  // SET MANAGERS
  // -----------------------------------------------------------------
  setManagers(socket: SocketManager, rtc: WebRTCManager, audio: AudioManager) {
    this.socket = socket;
    this.rtc = rtc;
    this.audio = audio;
    // Sólo enlazamos los handlers de socket cuando la escena ya fue creada,
    // si no, los handlers usarían mapManager / textures que aún no existen.
    if (this.created && !this.boundSocket) this.bindSocket();
  }

  private boundSocket = false;

  private bindSocket() {
    if (!this.socket || this.boundSocket) return;
    this.boundSocket = true;
    this.socket.onPlayersList(list => this.handlePlayersList(list));
    this.socket.onPlayerJoin(p => this.addRemote(p));
    this.socket.onPlayerLeave(id => this.removeRemote(id));
    this.socket.onPlayerMove(d => this.handleRemoteMove(d));
    this.socket.onPlayerUpdate(d => this.handleRemoteUpdate(d));
    this.socket.onPlayerSpeaking(d => this.handleSpeaking(d));
    this.socket.onPlayerEmote(d => this.handleEmote(d));
    this.socket.onMapChange(d => this.handleMapChange(d));

    this.socket.onChairSit(({ chairId, playerId }) => {
      const ent = this.entityFor(playerId);
      if (ent) {
        const chair = this.mapManager.chairs.find(c => c.id === chairId);
        if (chair) {
          ent.setPositionInstant(chair.x, chair.y - 6);
          ent.sprite.setTexture(SpriteFactory.keySitting(ent.data.avatar), 0);
          ent.data.sittingOn = chairId;
        }
      }
    });
    this.socket.onChairStand(({ playerId }) => {
      const ent = this.entityFor(playerId);
      if (ent) {
        ent.data.sittingOn = undefined;
        ent.playIdle(ent.data.direction);
      }
    });

    // Sticky notes
    this.socket.onStickyList(list => list.forEach(n => this.addStickyVisual(n)));
    this.socket.onStickyCreate(n => this.addStickyVisual(n));
    this.socket.onStickyDelete(id => this.removeStickyVisual(id));

    // Mobiliario colocado
    this.socket.onFurnitureList(list => {
      this.mapManager.clearPlaced();
      for (const f of list) this.mapManager.addPlaced(f);
    });
    this.socket.onFurniturePlace(f => this.mapManager.addPlaced(f));
    this.socket.onFurnitureMove(({ id, x, y }) => this.mapManager.movePlaced(id, x, y));
    this.socket.onFurnitureRemove(id => this.mapManager.removePlaced(id));
  }

  // -----------------------------------------------------------------
  // EDIT MODE API (lo llama GameContainer desde React)
  // -----------------------------------------------------------------
  setEditMode(on: boolean) {
    this.editMode = on;
    this.mapManager.setEditMode(on);
    if (!on) {
      this.selectedFurnitureType = null;
      this.ghost?.destroy(); this.ghost = undefined;
    }
  }

  setSelectedFurnitureType(type: string | null) {
    this.selectedFurnitureType = type;
    this.ghost?.destroy(); this.ghost = undefined;
    if (type) {
      // Ghost preview que sigue al puntero
      const g = (this.mapManager as any).buildFurnitureContainer(type) as Phaser.GameObjects.Container;
      g.setAlpha(0.5);
      g.setDepth(9999);
      this.ghost = g;
    }
  }

  // -----------------------------------------------------------------
  // PLAYER MGMT
  // -----------------------------------------------------------------
  private entityFor(id: string): PlayerEntity | undefined {
    if (this.localData?.id === id) return this.localPlayer;
    return this.remote.get(id);
  }

  private handlePlayersList(list: PlayerData[]) {
    const localId = this.socket?.getSocketId();
    // Limpiar viejos
    for (const id of Array.from(this.remote.keys())) {
      if (!list.find(p => p.id === id)) {
        this.remote.get(id)?.destroy();
        this.remote.delete(id);
      }
    }
    for (const p of list) {
      if (p.id === localId) {
        if (!this.localPlayer) {
          this.localData = p;
          this.localPlayer = new PlayerEntity(this, p, { isLocal: true });
          if (this.mapManager.current) {
            this.applyMapCamera(this.mapManager.current, p.x, p.y);
          } else {
            this.cameras.main.startFollow(this.localPlayer.sprite, true, 0.15, 0.15);
          }
          this.callbacks.onLocalPlayerReady?.(p.id);
        } else {
          this.localData = p;
          this.localPlayer.setPositionInstant(p.x, p.y);
          this.localPlayer.setAvatar(p.avatar);
          this.localPlayer.setName(p.name);
        }
      } else if (!this.remote.has(p.id)) {
        this.remote.set(p.id, new PlayerEntity(this, p));
      }
    }
    this.notifyPlayers();
  }

  private addRemote(p: PlayerData) {
    if (p.id === this.socket?.getSocketId()) return;
    if (this.remote.has(p.id)) return;
    this.remote.set(p.id, new PlayerEntity(this, p));
    this.audio?.playJoin();
    this.notifyPlayers();
  }
  private removeRemote(id: string) {
    this.remote.get(id)?.destroy();
    this.remote.delete(id);
    this.audio?.playLeave();
    this.notifyPlayers();
  }

  private handleRemoteMove(d: { id: string; x: number; y: number; direction: string; moving: boolean }) {
    const ent = this.remote.get(d.id);
    if (!ent) return;
    ent.setTarget(d.x, d.y);
    ent.setDirection(d.direction as Direction, d.moving);
  }
  private handleRemoteUpdate(d: any) {
    const ent = this.entityFor(d.id);
    if (!ent) return;
    if (typeof d.micOn === 'boolean' || typeof d.camOn === 'boolean') {
      ent.setMicCam(d.micOn ?? ent.data.micOn, d.camOn ?? ent.data.camOn);
    }
    if (d.status) ent.setStatus(d.status);
    if (d.avatar) ent.setAvatar(d.avatar);
    if (d.name) ent.setName(d.name);
    this.notifyPlayers();
  }
  private handleSpeaking(d: { id: string; speaking: boolean }) {
    const ent = this.entityFor(d.id);
    ent?.setSpeaking(d.speaking);
  }
  private handleEmote(d: { id: string; emote: string }) {
    const ent = this.entityFor(d.id);
    ent?.showEmote(d.emote);
  }

  // -----------------------------------------------------------------
  // MAP CHANGE
  // -----------------------------------------------------------------
  /**
   * Llega cuando el servidor confirma un fast-travel.
   * Como ahora sólo existe un mapa 'world', es siempre un teleport del
   * jugador local; nunca recarga el mapa.
   */
  private handleMapChange(d: { mapId: string; spawnX: number; spawnY: number }) {
    this.clickTarget = undefined;
    if (this.localPlayer && this.localData) {
      this.localData.x = d.spawnX;
      this.localData.y = d.spawnY;
      this.localData.sittingOn = undefined;
      this.localPlayer.setPositionInstant(d.spawnX, d.spawnY);
    }
    if (this.mapManager.current) {
      this.applyMapCamera(this.mapManager.current, d.spawnX, d.spawnY);
    }
    this.callbacks.onMapChanged?.(d.mapId);
  }

  /**
   * Aplica bounds y centra/sigue al jugador en (focusX, focusY).
   * Mantiene zoom = 1 (sin escalar) para evitar artefactos de tamaño.
   */
  private applyMapCamera(def: { widthTiles: number; heightTiles: number; tileSize: number }, focusX: number, focusY: number) {
    const cam = this.cameras.main;
    const wpx = def.widthTiles * def.tileSize;
    const hpx = def.heightTiles * def.tileSize;
    cam.setZoom(1);
    cam.setBounds(0, 0, wpx, hpx);
    if (this.localPlayer) {
      cam.startFollow(this.localPlayer.sprite, true, 0.18, 0.18);
    } else {
      cam.stopFollow();
    }
    cam.centerOn(focusX, focusY);
  }

  // -----------------------------------------------------------------
  // INPUT / UPDATE
  // -----------------------------------------------------------------
  update(time: number, deltaMs: number) {
    // Ghost preview del mueble seleccionado siguiendo al puntero
    if (this.editMode && this.ghost) {
      const wp = this.input.activePointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      this.ghost.setPosition(wp.x, wp.y);
    }

    if (!this.localPlayer || !this.localData || !this.socket) return;

    // Emote/note shortcuts (N para nueva sticky)
    if (Phaser.Input.Keyboard.JustDown(this.noteKey!)) {
      this.promptStickyNote();
    }

    let vx = 0, vy = 0;
    const speed = CONSTANTS.PLAYER_SPEED;

    if (!this.localData.sittingOn) {
      if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx -= speed;
      if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx += speed;
      if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy -= speed;
      if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy += speed;

      // Click to move
      if (vx === 0 && vy === 0 && this.clickTarget) {
        const dx = this.clickTarget.x - this.localData.x;
        const dy = this.clickTarget.y - this.localData.y;
        const d = Math.hypot(dx, dy);
        if (d > 4) {
          vx = (dx / d) * speed;
          vy = (dy / d) * speed;
        } else {
          this.clickTarget = undefined;
          this.clickMarker?.destroy();
        }
      } else if (vx !== 0 || vy !== 0) {
        this.clickTarget = undefined;
        this.clickMarker?.destroy();
      }

      // Movimiento con colisiones
      const dt = deltaMs / 1000;
      let nx = this.localData.x + vx * dt;
      let ny = this.localData.y + vy * dt;
      if (this.mapManager.collidesAt(nx, this.localData.y)) nx = this.localData.x;
      if (this.mapManager.collidesAt(this.localData.x, ny)) ny = this.localData.y;

      this.localData.x = nx;
      this.localData.y = ny;
    }

    // Dirección + animación
    let dir: Direction = this.lastDirection;
    if (Math.abs(vx) > Math.abs(vy)) dir = vx > 0 ? 'right' : (vx < 0 ? 'left' : dir);
    else if (vy !== 0) dir = vy > 0 ? 'down' : 'up';
    const moving = (vx !== 0 || vy !== 0);
    this.localPlayer.setDirection(dir, moving);
    this.lastDirection = dir;

    // Actualizar zona privada local y enviar
    const newZone = this.mapManager.privateZoneAt(this.localData.x, this.localData.y);
    if (newZone !== this.localData.inPrivateZone) {
      this.localData.inPrivateZone = newZone;
    }

    // Teleport si encima
    const tp = this.mapManager.teleportAt(this.localData.x, this.localData.y);
    if (tp) {
      this.socket.changeMap(tp.toMapId);
    }

    // Throttle de envío
    if (time - this.lastSendTs > CONSTANTS.MOVE_THROTTLE_MS && (moving !== this.lastMoving || moving)) {
      this.socket.sendPlayerMove({
        x: this.localData.x,
        y: this.localData.y,
        direction: dir,
        moving,
      });
      this.lastSendTs = time;
      this.lastMoving = moving;
    } else if (!moving && this.lastMoving && time - this.lastSendTs > 100) {
      this.socket.sendPlayerMove({ x: this.localData.x, y: this.localData.y, direction: dir, moving: false });
      this.lastMoving = false;
      this.lastSendTs = time;
    }

    // Tick de entidades
    this.localPlayer.tick(deltaMs);
    for (const ent of this.remote.values()) ent.tick(deltaMs);

    // Proximidad visual
    this.proximityCircle?.setPosition(this.localData.x, this.localData.y - 6);

    // Distancias para audio espacial
    const distances = new Map<string, number>();
    for (const [id, ent] of this.remote) {
      distances.set(id, Math.hypot(ent.data.x - this.localData.x, ent.data.y - this.localData.y));
    }
    this.rtc?.updateSpatialVolumes(distances);
    this.callbacks.onProximityDistances?.(distances);

    // Actualizar minimapa de posiciones
    this.callbacks.onPlayerPositions?.(this.collectPositions());
  }

  private collectPositions() {
    const arr: { id: string; x: number; y: number; isLocal: boolean }[] = [];
    if (this.localData) arr.push({ id: this.localData.id, x: this.localData.x, y: this.localData.y, isLocal: true });
    for (const ent of this.remote.values()) arr.push({ id: ent.data.id, x: ent.data.x, y: ent.data.y, isLocal: false });
    return arr;
  }

  private notifyPlayers() {
    const arr: PlayerData[] = [];
    if (this.localData) arr.push(this.localData);
    for (const ent of this.remote.values()) arr.push(ent.data);
    this.callbacks.onPlayersUpdated?.(arr);
  }

  private requestSit(chairId: string) {
    const chair = this.mapManager.chairs.find(c => c.id === chairId);
    if (!chair || !this.localData) return;
    const d = Math.hypot(chair.x - this.localData.x, chair.y - this.localData.y);
    if (d > 64) return; // muy lejos
    this.socket?.sit(chairId);
  }

  private drawClickMarker(x: number, y: number) {
    this.clickMarker?.destroy();
    const g = this.add.graphics();
    g.lineStyle(2, 0x4ade80, 0.9);
    g.strokeCircle(x, y, 12);
    g.setDepth(60);
    this.clickMarker = g;
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 600,
      onComplete: () => g.destroy(),
    });
  }

  // -----------------------------------------------------------------
  // STICKY NOTES
  // -----------------------------------------------------------------
  private promptStickyNote() {
    if (!this.localData) return;
    const text = window.prompt('Texto de la sticky note (max 240 chars):');
    if (!text) return;
    this.socket?.createSticky({
      text: text.slice(0, 240),
      color: '#fef08a',
      x: this.localData.x,
      y: this.localData.y - 30,
    });
  }

  private addStickyVisual(note: StickyNote) {
    if (this.stickyContainers.has(note.id)) return;
    const container = this.add.container(note.x, note.y);
    const bg = this.add.rectangle(0, 0, 96, 80, Phaser.Display.Color.HexStringToColor(note.color).color, 0.95)
      .setStrokeStyle(1, 0x000, 0.3);
    const txt = this.add.text(0, 0, note.text, {
      fontSize: '10px', color: '#1f2937', wordWrap: { width: 88 }, align: 'center',
    }).setOrigin(0.5);
    const author = this.add.text(0, 36, '— ' + note.authorName, { fontSize: '9px', color: '#374151' }).setOrigin(0.5);
    container.add([bg, txt, author]);
    container.setDepth(40);
    container.setSize(96, 80);
    if (note.authorId === this.socket?.getSocketId()) {
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (window.confirm('Eliminar nota?')) this.socket?.deleteSticky(note.id);
      });
    }
    this.stickyContainers.set(note.id, container);
  }

  private removeStickyVisual(id: string) {
    const c = this.stickyContainers.get(id);
    c?.destroy();
    this.stickyContainers.delete(id);
  }

  // -----------------------------------------------------------------
  // PUBLIC API
  // -----------------------------------------------------------------
  triggerEmote(emote: string) {
    this.localPlayer?.showEmote(emote);
    this.socket?.sendEmote(emote);
  }

  setLocalAvatar(cfg: AvatarConfig) {
    if (this.localPlayer) this.localPlayer.setAvatar(cfg);
    if (this.localData) this.localData.avatar = cfg;
    this.socket?.sendPlayerUpdate({ avatar: cfg });
  }

  setLocalStatus(status: PlayerData['status']) {
    if (this.localPlayer) this.localPlayer.setStatus(status);
    if (this.localData) this.localData.status = status;
    this.socket?.sendPlayerUpdate({ status });
  }

  setLocalMicCam(micOn: boolean, camOn: boolean) {
    if (this.localPlayer) this.localPlayer.setMicCam(micOn, camOn);
    if (this.localData) { this.localData.micOn = micOn; this.localData.camOn = camOn; }
    this.socket?.sendPlayerUpdate({ micOn, camOn });
  }

  /**
   * Cambia el template del mapa en caliente (recarga geometría + colores).
   * Conserva jugadores, sticky notes y cámara.
   */
  setTemplate(templateId: TemplateId) {
    if (!this.created || !this.mapManager) {
      this.templateId = templateId;
      return;
    }
    if (this.templateId === templateId) return;
    this.templateId = templateId;
    const def = this.mapManager.load(templateId);
    this.callbacks.onMinimapReady?.(this.mapManager.minimapImage || '');
    if (this.localData) this.applyMapCamera(def, this.localData.x, this.localData.y);
  }
}
