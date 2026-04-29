import Phaser from 'phaser';
import { MapDefinition, MapChair, MapTeleport, CONSTANTS, PlacedFurniture } from '../../types';
import { MAPS } from '../utils/MapDefinitions';
import { LZ_KEYS, OFFICE_TILES, buildLimezuFurniture } from '../utils/LimezuAssets';

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

  /** Mobiliario colocado en runtime (mapa de id -> contenedor). */
  placedContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  /** Tipo guardado por id, para poder reconstruir si hace falta. */
  placedTypes: Map<string, string> = new Map();
  /** Estado de “modo edición” (lo activa GameContainer/GameScene). */
  editMode = false;

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
    this.clearPlaced();
  }

  // -----------------------------------------------------------------
  // PLACED FURNITURE (mobiliario dinámico colocado por el creador)
  // -----------------------------------------------------------------
  clearPlaced() {
    for (const c of this.placedContainers.values()) c.destroy();
    this.placedContainers.clear();
    this.placedTypes.clear();
  }

  addPlaced(item: PlacedFurniture) {
    if (this.placedContainers.has(item.id)) {
      this.movePlaced(item.id, item.x, item.y);
      return;
    }
    const c = this.buildFurnitureContainer(item.type);
    c.setPosition(item.x, item.y);
    c.setDepth(item.y / 100);
    c.setData('furnitureId', item.id);
    c.setData('furnitureType', item.type);
    c.setData('kind', 'furniture');
    this.placedContainers.set(item.id, c);
    this.placedTypes.set(item.id, item.type);
    if (this.editMode) this.applyEditModeTo(c);
  }

  movePlaced(id: string, x: number, y: number) {
    const c = this.placedContainers.get(id);
    if (!c) return;
    c.setPosition(x, y);
    c.setDepth(y / 100);
  }

  removePlaced(id: string) {
    const c = this.placedContainers.get(id);
    if (!c) return;
    c.destroy();
    this.placedContainers.delete(id);
    this.placedTypes.delete(id);
  }

  /** Activa/desactiva interactividad de drag y borrado en muebles colocados. */
  setEditMode(on: boolean) {
    this.editMode = on;
    for (const c of this.placedContainers.values()) {
      this.applyEditModeTo(c);
    }
  }

  private applyEditModeTo(c: Phaser.GameObjects.Container) {
    if (this.editMode) {
      c.setSize(48, 48);
      c.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-24, -24, 48, 48),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
        draggable: true,
      } as any);
      this.scene.input.setDraggable(c, true);
    } else {
      try { this.scene.input.setDraggable(c, false); } catch {}
      try { c.disableInteractive(); } catch {}
    }
  }

  /**
   * Construye un contenedor con la geometría visual del mueble en
   * coordenadas relativas (0,0). Lo reutilizamos para todos los placed.
   *
   * Si hay un sprite LimeZu disponible para el tipo, se usa.
   * Si no, fallback al render anterior con primitivas Phaser.
   */
  private buildFurnitureContainer(type: string): Phaser.GameObjects.Container {
    // Intentar primero con sprites pixel-art LimeZu
    const lz = buildLimezuFurniture(this.scene, type);
    if (lz) return lz;

    const c = this.scene.add.container(0, 0);
    if (type === 'desk') {
      c.add(this.scene.add.rectangle(0, 0, 64, 28, 0x6b4423));
      c.add(this.scene.add.rectangle(0, -14, 64, 4, 0x000000, 0.45));
    } else if (type === 'tree') {
      c.add(this.scene.add.rectangle(0, 10, 10, 22, 0x6b4423));
      c.add(this.scene.add.circle(-10, -4, 16, 0x166534));
      c.add(this.scene.add.circle(10, -4, 16, 0x15803d));
      c.add(this.scene.add.circle(0, -16, 18, 0x16a34a));
    } else if (type === 'bench') {
      c.add(this.scene.add.rectangle(0, 0, 56, 12, 0x8b5a2b).setStrokeStyle(1, 0x000000, 0.4));
      c.add(this.scene.add.rectangle(0, -10, 56, 4, 0x6b4423));
      c.add(this.scene.add.rectangle(-22, 10, 4, 10, 0x6b4423));
      c.add(this.scene.add.rectangle(22, 10, 4, 10, 0x6b4423));
    } else if (type === 'picnictable') {
      c.add(this.scene.add.rectangle(0, 0, 96, 36, 0xa16207).setStrokeStyle(2, 0x000000, 0.3));
      c.add(this.scene.add.rectangle(0, -22, 96, 8, 0xeab308));
      c.add(this.scene.add.rectangle(0, 22, 96, 8, 0xeab308));
    } else if (type === 'fire') {
      c.add(this.scene.add.circle(0, 0, 14, 0x57534e));
      c.add(this.scene.add.circle(0, -4, 9, 0xf97316));
      c.add(this.scene.add.circle(0, -8, 5, 0xfde047));
    } else if (type === 'flower') {
      c.add(this.scene.add.circle(-4, -2, 3, 0xec4899));
      c.add(this.scene.add.circle(4, -2, 3, 0xfbbf24));
      c.add(this.scene.add.circle(0, 4, 3, 0xa78bfa));
    } else {
      let icon = '📦';
      if (type === 'plant') icon = this.current?.id === 'nature' ? '🌳' : '🪴';
      else if (type === 'coffee') icon = '☕';
      else if (type === 'screen') icon = '🖥️';
      else if (type === 'lamp')   icon = '💡';
      else if (type === 'chair')  icon = '🪑';
      else if (type === 'sofa')   icon = '🛋️';
      else if (type === 'tv')     icon = '📺';
      else if (type === 'books')  icon = '📚';
      c.add(this.scene.add.text(0, 0, icon, { fontSize: '24px' }).setOrigin(0.5));
    }
    return c;
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

    // ¿Usamos tilesets pixel-art LimeZu para este template?
    // Por ahora solo office. Si la textura aún no se cargó (preload no
    // ejecutado), caemos a render con primitivas como antes.
    const useLimezu = def.id === 'office'
      && this.scene.textures.exists(LZ_KEYS.ROOM_BUILDER);

    // Si el template trae una imagen de fondo pre-renderizada (ej. casa
    // LimeZu), la mostramos en lugar de pintar tile-a-tile.
    const useBgImage = !!def.backgroundImage
      && this.scene.textures.exists(def.backgroundImage.key);
    // Mapas compuestos: varias áreas con imagen propia.
    const useBgImages = !!def.backgroundImages && def.backgroundImages.length > 0;
    // En cualquiera de los dos casos saltamos el render por tile y solo
    // registramos colisiones para tile=1.
    const skipTileSprites = useBgImage || useBgImages;

    // Suelo base (color sólido — queda como fondo si los sprites no cubren).
    // Si el mapa define `outdoorColor` (mapas compuestos con varias áreas
    // separadas por “patio/pasillo”), se usa ese color para el suelo
    // exterior; las imágenes de áreas se dibujan encima.
    const baseColor = (def.outdoorColor !== undefined) ? def.outdoorColor : def.bgColor;
    this.themed.push(
      this.scene.add.rectangle(wpx / 2, hpx / 2, wpx, hpx, baseColor).setDepth(-100)
    );

    // Fondo pre-renderizado único (imagen LimeZu cubre todo el mundo)
    if (useBgImage) {
      const bg = this.scene.add.image(wpx / 2, hpx / 2, def.backgroundImage!.key)
        .setDisplaySize(wpx, hpx)
        .setDepth(-95);
      // Pixel-art crisp
      bg.setOrigin(0.5);
      const tex = this.scene.textures.get(def.backgroundImage!.key);
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.themed.push(bg);
    }

    // Imágenes posicionadas (mapa compuesto: varias áreas LimeZu)
    if (def.backgroundImages) {
      for (const bgi of def.backgroundImages) {
        if (!this.scene.textures.exists(bgi.key)) continue;
        const img = this.scene.add.image(bgi.x + bgi.width / 2, bgi.y + bgi.height / 2, bgi.key)
          .setDisplaySize(bgi.width, bgi.height)
          .setOrigin(0.5)
          .setDepth(-95);
        const tex = this.scene.textures.get(bgi.key);
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.themed.push(img);
      }
    }

    // Corredores: piso de madera LimeZu en cada rectángulo en tiles.
    // Se dibujan ENCIMA de las áreas (depth -94) para "perforar"
    // visualmente las paredes pintadas en los PNG cuando el corredor
    // entra 1 tile dentro del área (puerta).
    if (def.corridors && this.scene.textures.exists(LZ_KEYS.ROOM_BUILDER)) {
      for (const c of def.corridors) {
        for (let yy = 0; yy < c.height; yy++) {
          for (let xx = 0; xx < c.width; xx++) {
            const cx = (c.x + xx) * T + T / 2;
            const cy = (c.y + yy) * T + T / 2;
            this.themed.push(
              this.scene.add.image(cx, cy, LZ_KEYS.ROOM_BUILDER, OFFICE_TILES.floorWood)
                .setDisplaySize(T, T)
                .setDepth(-94)
            );
          }
        }
      }
    } else if (def.corridors) {
      // Fallback sin textura: rectángulo de color madera
      for (const c of def.corridors) {
        this.themed.push(
          this.scene.add.rectangle(
            c.x * T + (c.width * T) / 2,
            c.y * T + (c.height * T) / 2,
            c.width * T,
            c.height * T,
            0x8B5A2B,
          ).setDepth(-94)
        );
      }
    }

    // Grid sutil (solo si NO usamos pixel-art)
    if (!useLimezu && !skipTileSprites) {
      const grid = this.scene.add.graphics();
      grid.lineStyle(1, 0xffffff, 0.04);
      for (let x = 0; x <= wpx; x += T) grid.lineBetween(x, 0, x, hpx);
      for (let y = 0; y <= hpx; y += T) grid.lineBetween(0, y, wpx, y);
      grid.setDepth(-99);
      this.themed.push(grid);
    }

    // Capa de tiles
    this.walls = this.scene.physics.add.staticGroup();
    for (let y = 0; y < def.heightTiles; y++) {
      for (let x = 0; x < def.widthTiles; x++) {
        const t = def.tiles[y][x];
        const cx = x * T + T / 2;
        const cy = y * T + T / 2;

        // Si tenemos imagen(es) de fondo, NO pintamos tiles individuales,
        // pero seguimos registrando colisiones para tiles=1.
        if (skipTileSprites) {
          if (t === 1) {
            this.collisionRects.push(new Phaser.Geom.Rectangle(x * T, y * T, T, T));
          }
          continue;
        }

        if (useLimezu) {
          // ---- OFFICE con sprites LimeZu ----
          // Suelo de madera por defecto en TODA la sala (incluyendo bajo paredes)
          this.themed.push(
            this.scene.add.image(cx, cy, LZ_KEYS.ROOM_BUILDER, OFFICE_TILES.floorWood)
              .setDisplaySize(T, T)
              .setDepth(-95)
          );

          if (t === 1) {
            // Pared (sprite + colisión real)
            const w = this.scene.add.image(cx, cy, LZ_KEYS.ROOM_BUILDER, OFFICE_TILES.wall)
              .setDisplaySize(T, T)
              .setDepth(0);
            this.scene.physics.add.existing(w, true);
            this.walls.add(w as any);
            const body = (w.body as Phaser.Physics.Arcade.StaticBody);
            if (body) body.updateFromGameObject();
            this.collisionRects.push(new Phaser.Geom.Rectangle(x * T, y * T, T, T));
          } else if (t === 2 || t === 3) {
            // Alfombra de acento sobre madera
            this.themed.push(
              this.scene.add.image(cx, cy, LZ_KEYS.ROOM_BUILDER, OFFICE_TILES.floorCarpet)
                .setDisplaySize(T, T)
                .setDepth(-90)
            );
          }
          continue;
        }

        // ---- Render legacy con primitivas (otros templates) ----
        if (t === 1) {
          // pared
          const w = this.scene.add.rectangle(cx, cy, T, T, def.wallColor);
          w.setStrokeStyle(1, 0x000000, 0.3);
          this.walls.add(w as any);
          const body = (w.body as Phaser.Physics.Arcade.StaticBody);
          if (body) body.updateFromGameObject();
          this.collisionRects.push(new Phaser.Geom.Rectangle(x * T, y * T, T, T));
        } else if (t === 2) {
          // alfombra (color de acento)
          this.themed.push(
            this.scene.add.rectangle(cx, cy, T, T, def.accentColor, 0.22).setDepth(-90)
          );
        } else if (t === 3) {
          // suelo madera/especial
          this.themed.push(
            this.scene.add.rectangle(cx, cy, T, T, 0x8B5A2B, 0.4).setDepth(-90)
          );
          this.themed.push(
            this.scene.add.rectangle(cx, cy - T / 3, T, 1, 0x000000, 0.18).setDepth(-89)
          );
        } else if (t === 4) {
          // tierra (sendero del parque)
          this.themed.push(
            this.scene.add.rectangle(cx, cy, T, T, 0x8b6a3f, 0.85).setDepth(-90)
          );
        } else if (t === 5) {
          // césped (variación verde sutil sobre bg)
          const v = ((x * 7 + y * 11) % 5) / 60;
          this.themed.push(
            this.scene.add.rectangle(cx, cy, T, T, 0x4d7c0f, 0.55 + v).setDepth(-95)
          );
        } else if (t === 6) {
          // agua / cristal
          this.themed.push(
            this.scene.add.rectangle(cx, cy, T, T, 0x38bdf8, 0.65).setDepth(-90)
          );
          this.themed.push(
            this.scene.add.rectangle(cx, cy - T / 4, T - 4, 1, 0xffffff, 0.4).setDepth(-89)
          );
        }
      }
    }

    // Colisiones extra (rectángulos arbitrarios en píxeles, p.ej. para
    // muebles del fondo pre-renderizado por los que no se debe pasar).
    if (def.extraCollisions) {
      for (const r of def.extraCollisions) {
        this.collisionRects.push(new Phaser.Geom.Rectangle(r.x, r.y, r.width, r.height));
        // Cuerpo invisible para que choque con sprites con física (jugadores
        // no usan física estricta porque la colisión se hace por collidesAt,
        // pero registrar el cuerpo no hace daño).
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

    // Si hay sprite LimeZu para este tipo y estamos en office, úsalo.
    if (def?.id === 'office') {
      const lz = buildLimezuFurniture(this.scene, type);
      if (lz) {
        lz.setPosition(x, y);
        lz.setDepth(y / 100);
        this.themed.push(lz);
        return;
      }
    }

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

  /** Genera un minimapa (PNG dataURL) bajado de resolución.
   *  Si el mapa trae backgroundImage, devolvemos directamente esa URL
   *  para que el minimapa se vea como el mapa real. */
  private renderMinimap(def: MapDefinition): string {
    if (def.backgroundImage) return def.backgroundImage.url;

    const cell = 4;
    const c = document.createElement('canvas');
    c.width = def.widthTiles * cell;
    c.height = def.heightTiles * cell;
    const ctx = c.getContext('2d')!;

    // Mapas compuestos: pintamos suelo exterior + cada imagen de área en
    // su posición real, escalada al cell del minimapa.
    if (def.backgroundImages && def.backgroundImages.length) {
      const out = (def.outdoorColor !== undefined) ? def.outdoorColor : def.bgColor;
      ctx.fillStyle = '#' + out.toString(16).padStart(6, '0');
      ctx.fillRect(0, 0, c.width, c.height);
      // Pintamos cada área asíncronamente (cargamos cada imagen y dibujamos).
      // Como renderMinimap es síncrono (devuelve dataURL al instante), lo
      // que hacemos aquí es: marcamos cada área con un rectángulo de su
      // color de zona privada como placeholder, y devolvemos el canvas.
      // Las imágenes reales se ven en el mapa, no en el minimapa.
      for (const bgi of def.backgroundImages) {
        const px = (bgi.x / def.tileSize) * cell;
        const py = (bgi.y / def.tileSize) * cell;
        const pw = (bgi.width / def.tileSize) * cell;
        const ph = (bgi.height / def.tileSize) * cell;
        ctx.fillStyle = '#' + def.wallColor.toString(16).padStart(6, '0');
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      }
      // Zonas privadas marcadas con su color encima
      for (const z of def.privateZones) {
        ctx.fillStyle = z.color + 'aa';
        ctx.fillRect(z.x * cell, z.y * cell, z.width * cell, z.height * cell);
      }
      for (const tp of def.teleports) {
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(tp.x * cell, tp.y * cell, tp.width * cell, tp.height * cell);
      }
      return c.toDataURL();
    }

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
    // Colisiones extra (no provienen del grid)
    if (this.current.extraCollisions) {
      for (const r of this.current.extraCollisions) {
        if (px + radius > r.x && px - radius < r.x + r.width &&
            py + radius > r.y && py - radius < r.y + r.height) return true;
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
