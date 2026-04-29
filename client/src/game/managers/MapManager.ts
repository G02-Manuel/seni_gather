import Phaser from 'phaser';
import { MapDefinition, MapChair, MapTeleport, CONSTANTS } from '../../types';
import { MAPS } from '../utils/MapDefinitions';

export interface MapRenderResult {
  collisionLayer: Phaser.GameObjects.Group;
  /** Imagen del minimapa (data URL) */
  minimap: string;
}

/**
 * Renderiza un MapDefinition usando primitivas de Phaser (sin tilesheets externos).
 * Crea capas de suelo, paredes, decoraciones, sillas y teletransportes.
 */
export class MapManager {
  private scene: Phaser.Scene;
  current?: MapDefinition;
  collisionRects: Phaser.Geom.Rectangle[] = [];
  chairs: MapChair[] = [];
  teleports: MapTeleport[] = [];
  decorationsGroup?: Phaser.GameObjects.Group;
  walls?: Phaser.Physics.Arcade.StaticGroup;
  proximityCircles: Phaser.GameObjects.Graphics[] = [];

  // Minimap data
  minimapImage: string | null = null;

  /** Todos los GameObjects creados por load() — para destruir en clear(). */
  private themed: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Devuelve la definición del mapa por id (solo lectura) */
  static getDefinition(id: string): MapDefinition | undefined { return MAPS[id]; }

  /** Limpia todo lo creado por load() */
  clear() {
    this.walls?.clear(true, true);
    this.decorationsGroup?.clear(true, true);
    this.proximityCircles.forEach(c => c.destroy());
    this.proximityCircles = [];
    for (const o of this.themed) o.destroy();
    this.themed = [];
    this.collisionRects = [];
    this.chairs = [];
    this.teleports = [];
  }

  /** Carga un template por id y lo renderiza. */
  load(mapId: string, _unused?: string): MapDefinition {
    const def = MAPS[mapId];
    if (!def) throw new Error(`Template desconocido: ${mapId}`);
    this.clear();
    this.current = def;

    const T = def.tileSize;
    const wpx = def.widthTiles * T;
    const hpx = def.heightTiles * T;

    // Suelo base
    this.themed.push(
      this.scene.add.rectangle(wpx / 2, hpx / 2, wpx, hpx, def.bgColor).setDepth(-100)
    );

    // Grid sutil
    const grid = this.scene.add.graphics();
    grid.lineStyle(1, 0xffffff, 0.04);
    for (let x = 0; x <= wpx; x += T) grid.lineBetween(x, 0, x, hpx);
    for (let y = 0; y <= hpx; y += T) grid.lineBetween(0, y, wpx, y);
    grid.setDepth(-99);
    this.themed.push(grid);

    // Capa de tiles
    this.walls = this.scene.physics.add.staticGroup();
    for (let y = 0; y < def.heightTiles; y++) {
      for (let x = 0; x < def.widthTiles; x++) {
        const t = def.tiles[y][x];
        if (t === 1) {
          // pared
          const w = this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, def.wallColor);
          w.setStrokeStyle(1, 0x000000, 0.3);
          this.walls.add(w as any);
          const body = (w.body as Phaser.Physics.Arcade.StaticBody);
          if (body) body.updateFromGameObject();
          this.collisionRects.push(new Phaser.Geom.Rectangle(x * T, y * T, T, T));
        } else if (t === 2) {
          // alfombra (color de acento)
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, def.accentColor, 0.22).setDepth(-90)
          );
        } else if (t === 3) {
          // suelo madera/especial
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, 0x8B5A2B, 0.4).setDepth(-90)
          );
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2 - T / 3, T, 1, 0x000000, 0.18).setDepth(-89)
          );
        } else if (t === 4) {
          // tierra (sendero del parque)
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, 0x8b6a3f, 0.85).setDepth(-90)
          );
        } else if (t === 5) {
          // césped (variación verde sutil sobre bg)
          const v = ((x * 7 + y * 11) % 5) / 60;
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, 0x4d7c0f, 0.55 + v).setDepth(-95)
          );
        } else if (t === 6) {
          // agua / cristal
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2, T, T, 0x38bdf8, 0.65).setDepth(-90)
          );
          this.themed.push(
            this.scene.add.rectangle(x * T + T / 2, y * T + T / 2 - T / 4, T - 4, 1, 0xffffff, 0.4).setDepth(-89)
          );
        }
      }
    }

    // Zonas privadas
    for (const zone of def.privateZones) {
      const zx = zone.x * T;
      const zy = zone.y * T;
      const zw = zone.width * T;
      const zh = zone.height * T;
      const col = Phaser.Display.Color.HexStringToColor(zone.color).color;
      this.themed.push(
        this.scene.add.rectangle(zx + zw / 2, zy + zh / 2, zw, zh, col, 0.05)
          .setDepth(-80)
          .setStrokeStyle(2, col, 0.4)
      );
      this.themed.push(
        this.scene.add.text(zx + 6, zy + 4, zone.name, {
          fontSize: '11px',
          color: zone.color,
          fontStyle: 'bold',
        }).setDepth(-79)
      );
    }

    // Decoraciones
    this.decorationsGroup = this.scene.add.group();
    for (const dec of def.decorations) {
      this.drawDecoration(dec.type, dec.x, dec.y);
    }

    // Sillas
    this.chairs = def.chairs;
    for (const chair of def.chairs) {
      this.drawChair(chair);
    }

    // Pizarras
    for (const wb of def.whiteboards) {
      const g = this.scene.add.rectangle(wb.x, wb.y, wb.width, wb.height, 0xffffff, 0.95)
        .setStrokeStyle(2, 0x333333, 1).setDepth(2);
      g.setInteractive({ useHandCursor: true });
      g.setData('whiteboardId', wb.id);
      g.setData('kind', 'whiteboard');
      this.themed.push(g);
      this.themed.push(
        this.scene.add.text(wb.x, wb.y, '🖊️ Pizarra (Click)', { fontSize: '10px', color: '#333' })
          .setOrigin(0.5).setDepth(3)
      );
    }

    // Pantallas
    for (const sc of def.screens) {
      const g = this.scene.add.rectangle(sc.x, sc.y, sc.width, sc.height, 0x111827, 1)
        .setStrokeStyle(3, 0x4b5563, 1).setDepth(2);
      g.setInteractive({ useHandCursor: true });
      g.setData('screenId', sc.id);
      g.setData('kind', 'screen');
      this.themed.push(g);
      this.themed.push(
        this.scene.add.text(sc.x, sc.y, '📺 Compartir pantalla', { fontSize: '10px', color: '#9ca3af' })
          .setOrigin(0.5).setDepth(3)
      );
    }

    // Bounds
    this.scene.cameras.main.setBackgroundColor(def.bgColor);
    this.scene.cameras.main.setBounds(0, 0, wpx, hpx);
    this.scene.physics.world.setBounds(0, 0, wpx, hpx);

    this.minimapImage = this.renderMinimap(def);
    return def;
  }

  /** Dibuja iconos decorativos sin assets */
  private drawDecoration(type: string, x: number, y: number) {
    const def = this.current;
    const g = this.scene.add.container(x, y);
    let icon = '';

    if (type === 'desk') {
      this.themed.push(this.scene.add.rectangle(x, y, 64, 28, 0x6b4423).setDepth(0));
      this.themed.push(this.scene.add.rectangle(x, y - 14, 64, 4, 0x000000, 0.45).setDepth(1));
      g.destroy();
      return;
    }
    if (type === 'tree') {
      // Tronco
      this.themed.push(this.scene.add.rectangle(x, y + 10, 10, 22, 0x6b4423).setDepth(0));
      // Copa (3 círculos sobrepuestos)
      this.themed.push(this.scene.add.circle(x - 10, y - 4, 16, 0x166534).setDepth(1));
      this.themed.push(this.scene.add.circle(x + 10, y - 4, 16, 0x15803d).setDepth(1));
      this.themed.push(this.scene.add.circle(x, y - 16, 18, 0x16a34a).setDepth(2));
      g.destroy();
      return;
    }
    if (type === 'bench') {
      this.themed.push(this.scene.add.rectangle(x, y, 56, 12, 0x8b5a2b).setStrokeStyle(1, 0x000, 0.4).setDepth(0));
      this.themed.push(this.scene.add.rectangle(x, y - 10, 56, 4, 0x6b4423).setDepth(1));
      this.themed.push(this.scene.add.rectangle(x - 22, y + 10, 4, 10, 0x6b4423).setDepth(0));
      this.themed.push(this.scene.add.rectangle(x + 22, y + 10, 4, 10, 0x6b4423).setDepth(0));
      g.destroy();
      return;
    }
    if (type === 'picnictable') {
      this.themed.push(this.scene.add.rectangle(x, y, 96, 36, 0xa16207).setStrokeStyle(2, 0x000, 0.3).setDepth(0));
      this.themed.push(this.scene.add.rectangle(x, y - 22, 96, 8, 0xeab308).setDepth(1));
      this.themed.push(this.scene.add.rectangle(x, y + 22, 96, 8, 0xeab308).setDepth(1));
      g.destroy();
      return;
    }
    if (type === 'fire') {
      this.themed.push(this.scene.add.circle(x, y, 14, 0x57534e).setDepth(0));
      this.themed.push(this.scene.add.circle(x, y - 4, 9, 0xf97316).setDepth(1));
      this.themed.push(this.scene.add.circle(x, y - 8, 5, 0xfde047).setDepth(2));
      g.destroy();
      return;
    }
    if (type === 'flower') {
      this.themed.push(this.scene.add.circle(x - 4, y - 2, 3, 0xec4899).setDepth(0));
      this.themed.push(this.scene.add.circle(x + 4, y - 2, 3, 0xfbbf24).setDepth(0));
      this.themed.push(this.scene.add.circle(x,     y + 4, 3, 0xa78bfa).setDepth(0));
      g.destroy();
      return;
    }
    if (type === 'plant') {
      // Adapta el ícono al fondo: oscuro = futurista, verde = nature
      const isNature = def?.id === 'nature';
      icon = isNature ? '🌳' : '🪴';
    }
    else if (type === 'coffee') icon = '☕';
    else if (type === 'screen') icon = '🖥️';
    else icon = '📦';

    const t = this.scene.add.text(0, 0, icon, { fontSize: '24px' }).setOrigin(0.5);
    g.add(t);
    g.setDepth(0);
    this.decorationsGroup?.add(g);
  }

  private drawChair(chair: MapChair) {
    const g = this.scene.add.container(chair.x, chair.y);
    const base = this.scene.add.rectangle(0, 4, 24, 18, 0x374151).setStrokeStyle(1, 0x000, 0.4);
    let back: Phaser.GameObjects.Rectangle;
    if (chair.facing === 'up')         back = this.scene.add.rectangle(0, -8, 24, 6, 0x6b7280);
    else if (chair.facing === 'down')  back = this.scene.add.rectangle(0, 14, 24, 6, 0x6b7280);
    else if (chair.facing === 'left')  back = this.scene.add.rectangle(-12, 4, 4, 16, 0x6b7280);
    else                                back = this.scene.add.rectangle(12, 4, 4, 16, 0x6b7280);
    g.add([base, back]);
    g.setDepth(0);
    g.setSize(28, 28);
    g.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-14, -10, 28, 28), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    g.setData('chairId', chair.id);
    g.setData('kind', 'chair');
    g.setData('facing', chair.facing);
    this.themed.push(g);
  }

  /** Genera un minimapa (PNG dataURL) bajado de resolución */
  private renderMinimap(def: MapDefinition): string {
    const cell = 4;
    const c = document.createElement('canvas');
    c.width = def.widthTiles * cell;
    c.height = def.heightTiles * cell;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#' + def.bgColor.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, c.width, c.height);

    for (let y = 0; y < def.heightTiles; y++) {
      for (let x = 0; x < def.widthTiles; x++) {
        const t = def.tiles[y][x];
        if (t === 1) {
          ctx.fillStyle = '#' + def.wallColor.toString(16).padStart(6, '0');
          ctx.fillRect(x * cell, y * cell, cell, cell);
        } else if (t === 5) {
          ctx.fillStyle = 'rgba(132,204,22,0.35)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        } else if (t === 4) {
          ctx.fillStyle = 'rgba(139,106,63,0.7)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        } else if (t === 6) {
          ctx.fillStyle = 'rgba(56,189,248,0.6)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        } else if (t === 2 || t === 3) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    for (const tp of def.teleports) {
      ctx.fillStyle = '#9333ea';
      ctx.fillRect(tp.x * cell, tp.y * cell, tp.width * cell, tp.height * cell);
    }

    return c.toDataURL();
  }

  /** Devuelve true si la posición pixel toca pared */
  collidesAt(px: number, py: number, radius = CONSTANTS.PLAYER_SIZE / 2): boolean {
    const T = this.current?.tileSize || CONSTANTS.TILE_SIZE;
    const minX = Math.floor((px - radius) / T);
    const maxX = Math.floor((px + radius) / T);
    const minY = Math.floor((py - radius) / T);
    const maxY = Math.floor((py + radius) / T);
    if (!this.current) return false;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (y < 0 || x < 0 || y >= this.current.heightTiles || x >= this.current.widthTiles) return true;
        if (this.current.tiles[y][x] === 1) return true;
      }
    }
    return false;
  }

  /** Devuelve teleport activo si el jugador está dentro */
  teleportAt(px: number, py: number): MapTeleport | null {
    const T = this.current?.tileSize || CONSTANTS.TILE_SIZE;
    for (const tp of this.teleports) {
      if (px >= tp.x * T && px <= (tp.x + tp.width) * T &&
          py >= tp.y * T && py <= (tp.y + tp.height) * T) return tp;
    }
    return null;
  }

  /** Silla más cercana dentro del radio */
  nearestChair(px: number, py: number, maxDist = 48): MapChair | null {
    let best: MapChair | null = null;
    let bestD = maxDist;
    for (const c of this.chairs) {
      const d = Math.hypot(c.x - px, c.y - py);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  /** Zona privada en la que está el jugador */
  privateZoneAt(px: number, py: number): string | undefined {
    const T = this.current?.tileSize || CONSTANTS.TILE_SIZE;
    if (!this.current) return undefined;
    for (const z of this.current.privateZones) {
      if (px >= z.x * T && px <= (z.x + z.width) * T &&
          py >= z.y * T && py <= (z.y + z.height) * T) return z.id;
    }
    return undefined;
  }
}
