import Phaser from 'phaser';
import {
  AvatarConfig, SKIN_PALETTE, HAIR_PALETTE, OUTFIT_PALETTE, CONSTANTS,
} from '../../types';

const FRAME_W = CONSTANTS.AVATAR_FRAME_W;     // 32
const FRAME_H = CONSTANTS.AVATAR_FRAME_H;     // 48
const FRAMES_PER_DIR = 4;                      // walk frames
// Spritesheet layout (filas):
//   row 0: down  (4 frames: idle, walk1, idle, walk2)
//   row 1: left
//   row 2: right
//   row 3: up
const ROWS = 4;

/**
 * Genera procedimentalmente sprites pixelart de avatares (32x48) con
 * animaciones de caminar en las 4 direcciones, y los registra en el
 * texture manager de Phaser.
 *
 * No requiere assets externos.
 */
export class SpriteFactory {
  /** Hash determinista para identificar texture por avatar */
  static keyFor(cfg: AvatarConfig): string {
    return `avatar_${cfg.skin}_${cfg.hair}_${cfg.hairColor}_${cfg.outfit}_${cfg.outfitColor}_${cfg.accessory}`;
  }

  static keySitting(cfg: AvatarConfig): string {
    return SpriteFactory.keyFor(cfg) + '_sit';
  }

  /** Crea o reutiliza una textura spritesheet para el avatar */
  static ensureAvatar(scene: Phaser.Scene, cfg: AvatarConfig): string {
    const key = SpriteFactory.keyFor(cfg);
    if (scene.textures.exists(key)) return key;

    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * FRAMES_PER_DIR;
    canvas.height = FRAME_H * ROWS;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < ROWS; row++) {
      const dir: 'down' | 'left' | 'right' | 'up' = ['down', 'left', 'right', 'up'][row] as any;
      for (let frame = 0; frame < FRAMES_PER_DIR; frame++) {
        SpriteFactory.drawAvatarFrame(ctx, frame * FRAME_W, row * FRAME_H, cfg, dir, frame);
      }
    }

    scene.textures.addCanvas(key, canvas);
    SpriteFactory.registerFrames(scene, key);
    SpriteFactory.registerAnimations(scene, key);

    // Versión sentado (un solo frame, mirando abajo)
    const sitKey = SpriteFactory.keySitting(cfg);
    if (!scene.textures.exists(sitKey)) {
      const sitCanvas = document.createElement('canvas');
      sitCanvas.width = FRAME_W;
      sitCanvas.height = FRAME_H;
      const sitCtx = sitCanvas.getContext('2d')!;
      sitCtx.imageSmoothingEnabled = false;
      SpriteFactory.drawAvatarFrame(sitCtx, 0, 0, cfg, 'down', 0, /*sitting=*/ true);
      scene.textures.addCanvas(sitKey, sitCanvas);
    }

    return key;
  }

  // -----------------------------------------------------------------
  // FRAME REGISTRATION
  // -----------------------------------------------------------------
  private static registerFrames(scene: Phaser.Scene, key: string) {
    const tex = scene.textures.get(key);
    for (let row = 0; row < ROWS; row++) {
      for (let frame = 0; frame < FRAMES_PER_DIR; frame++) {
        const idx = row * FRAMES_PER_DIR + frame;
        tex.add(idx, 0, frame * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
      }
    }
  }

  private static registerAnimations(scene: Phaser.Scene, key: string) {
    const dirs = ['down', 'left', 'right', 'up'];
    dirs.forEach((dir, row) => {
      const walkKey = `${key}_walk_${dir}`;
      const idleKey = `${key}_idle_${dir}`;
      if (!scene.anims.exists(walkKey)) {
        scene.anims.create({
          key: walkKey,
          frames: [
            { key, frame: row * FRAMES_PER_DIR + 1 },
            { key, frame: row * FRAMES_PER_DIR + 0 },
            { key, frame: row * FRAMES_PER_DIR + 3 },
            { key, frame: row * FRAMES_PER_DIR + 0 },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
      if (!scene.anims.exists(idleKey)) {
        scene.anims.create({
          key: idleKey,
          frames: [{ key, frame: row * FRAMES_PER_DIR + 0 }],
          frameRate: 1,
          repeat: -1,
        });
      }
    });
  }

  // -----------------------------------------------------------------
  // PIXEL RENDERING
  // -----------------------------------------------------------------
  /**
   * Dibuja un único frame de avatar (32x48) en (ox, oy).
   * frameIdx 0..3, donde 1 y 3 son los frames de paso (alternados).
   */
  private static drawAvatarFrame(
    ctx: CanvasRenderingContext2D,
    ox: number, oy: number,
    cfg: AvatarConfig,
    dir: 'down' | 'left' | 'right' | 'up',
    frameIdx: number,
    sitting: boolean = false,
  ) {
    const skin = '#' + SKIN_PALETTE[cfg.skin % SKIN_PALETTE.length].toString(16).padStart(6, '0');
    const hair = '#' + HAIR_PALETTE[cfg.hairColor % HAIR_PALETTE.length].toString(16).padStart(6, '0');
    const outfit = '#' + OUTFIT_PALETTE[cfg.outfitColor % OUTFIT_PALETTE.length].toString(16).padStart(6, '0');

    // Sombra base elíptica
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ox + FRAME_W / 2, oy + FRAME_H - 4, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing + alternancia de piernas
    const bob = (frameIdx === 1 || frameIdx === 3) ? -1 : 0;
    const legSwap = frameIdx === 3;
    const baseY = oy + bob;

    const px = (x: number, y: number, c: string, w = 1, h = 1) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, baseY + y, w, h);
    };

    // ----- Piernas / pies (sólo si no está sentado) -----
    if (!sitting) {
      // Pierna izquierda
      px(12, 42, outfit, 3, 4);
      px(12, 46, '#222222', 3, 1);
      // Pierna derecha
      px(17, 42, outfit, 3, 4);
      px(17, 46, '#222222', 3, 1);

      // Animación de paso: una pierna se levanta 1px
      if (legSwap) {
        ctx.clearRect(ox + 17, baseY + 45, 3, 2);
        px(17, 41, outfit, 3, 4);
        px(17, 45, '#222222', 3, 1);
      } else if (frameIdx === 1) {
        ctx.clearRect(ox + 12, baseY + 45, 3, 2);
        px(12, 41, outfit, 3, 4);
        px(12, 45, '#222222', 3, 1);
      }
    } else {
      // En modo sentado, dibujar piernas dobladas
      px(11, 38, outfit, 4, 6);
      px(17, 38, outfit, 4, 6);
    }

    // ----- Torso / camisa -----
    // Cuerpo (10px de ancho, 12px de alto)
    px(11, 28, outfit, 10, 12);
    // Detalle: cuello más oscuro
    px(13, 28, SpriteFactory.darken(outfit, 0.7), 6, 1);

    // Brazos
    px(8, 30, outfit, 3, 8);
    px(21, 30, outfit, 3, 8);
    // Manos
    px(8, 38, skin, 3, 2);
    px(21, 38, skin, 3, 2);

    // ----- Cabeza (16x16 area) -----
    // base de la cabeza
    px(10, 14, skin, 12, 14);
    // mejillas más oscuras (sombra)
    px(10, 26, SpriteFactory.darken(skin, 0.85), 12, 1);
    // contorno
    SpriteFactory.outline(ctx, ox + 10, baseY + 14, 12, 14);

    // Ojos
    let eyeY = 21;
    let eyeLX = 13, eyeRX = 17;
    if (dir === 'left') { eyeLX = 12; eyeRX = 15; }
    else if (dir === 'right') { eyeLX = 15; eyeRX = 18; }
    else if (dir === 'up') { eyeLX = 0; eyeRX = 0; eyeY = 0; }

    if (dir !== 'up') {
      px(eyeLX, eyeY, '#1f1f1f', 2, 2);
      px(eyeRX, eyeY, '#1f1f1f', 2, 2);
      // Brillo
      px(eyeLX + 1, eyeY, '#ffffff', 1, 1);
      px(eyeRX + 1, eyeY, '#ffffff', 1, 1);
    }

    // Boca
    if (dir === 'down') {
      px(14, 25, SpriteFactory.darken(skin, 0.5), 4, 1);
    } else if (dir === 'left') {
      px(12, 25, SpriteFactory.darken(skin, 0.5), 3, 1);
    } else if (dir === 'right') {
      px(17, 25, SpriteFactory.darken(skin, 0.5), 3, 1);
    }

    // ----- Cabello (estilos basados en cfg.hair) -----
    SpriteFactory.drawHair(px, cfg.hair, hair, dir);

    // ----- Accesorio -----
    if (cfg.accessory === 1) {
      // Lentes
      px(12, 21, '#1f1f1f', 8, 1);
      px(12, 22, '#1f1f1f', 1, 2);
      px(15, 22, '#1f1f1f', 1, 2);
      px(19, 22, '#1f1f1f', 1, 2);
    } else if (cfg.accessory === 2) {
      // Auriculares
      px(9, 16, '#222', 1, 6);
      px(22, 16, '#222', 1, 6);
      px(10, 14, '#222', 12, 1);
    } else if (cfg.accessory === 3) {
      // Bigote
      px(13, 24, '#3b2b18', 6, 1);
    } else if (cfg.accessory === 4) {
      // Gorro
      px(10, 12, hair, 12, 4);
      px(9, 16, hair, 14, 1);
    }
  }

  /** Dibuja diferentes estilos de cabello según hair (0..9) */
  private static drawHair(
    px: (x: number, y: number, c: string, w?: number, h?: number) => void,
    style: number, color: string, dir: string,
  ) {
    const s = style % 10;
    if (s === 0) {
      // Corto clásico
      px(10, 12, color, 12, 3);
      px(10, 15, color, 2, 4);
      px(20, 15, color, 2, 4);
    } else if (s === 1) {
      // Largo
      px(10, 12, color, 12, 4);
      px(9, 16, color, 2, 12);
      px(21, 16, color, 2, 12);
    } else if (s === 2) {
      // Mohawk
      px(15, 8, color, 2, 8);
      px(13, 12, color, 6, 3);
    } else if (s === 3) {
      // Afro
      px(8, 10, color, 16, 6);
    } else if (s === 4) {
      // Coletas
      px(10, 12, color, 12, 3);
      px(7, 14, color, 3, 8);
      px(22, 14, color, 3, 8);
    } else if (s === 5) {
      // Calvo / muy corto
      px(11, 13, color, 10, 1);
    } else if (s === 6) {
      // Flequillo
      px(10, 12, color, 12, 3);
      px(11, 15, color, 10, 2);
    } else if (s === 7) {
      // Punk
      px(10, 10, color, 12, 5);
      px(12, 8, color, 2, 2);
      px(15, 8, color, 2, 2);
      px(18, 8, color, 2, 2);
    } else if (s === 8) {
      // Trenzas
      px(10, 12, color, 12, 3);
      px(8, 15, color, 2, 14);
      px(22, 15, color, 2, 14);
    } else if (s === 9) {
      // Cresta lateral
      px(10, 12, color, 12, 3);
      px(10, 15, color, 4, 5);
    }
    // Sombra del cabello en parte superior
    if (dir === 'up') {
      px(10, 11, color, 12, 1);
    }
  }

  // -----------------------------------------------------------------
  // UTIL
  // -----------------------------------------------------------------
  private static darken(hex: string, factor: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.floor(((n >> 16) & 255) * factor);
    const g = Math.floor(((n >> 8) & 255) * factor);
    const b = Math.floor((n & 255) * factor);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private static outline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  // -----------------------------------------------------------------
  // STATIC PREVIEW (para UI fuera de Phaser)
  // -----------------------------------------------------------------
  /** Genera un canvas independiente con el avatar (para AvatarCustomizer) */
  static renderPreview(cfg: AvatarConfig, scale = 3): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_W * scale;
    canvas.height = FRAME_H * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // Render a frame en buffer 1x luego escalado
    const buf = document.createElement('canvas');
    buf.width = FRAME_W; buf.height = FRAME_H;
    const bctx = buf.getContext('2d')!;
    bctx.imageSmoothingEnabled = false;
    SpriteFactory.drawAvatarFrame(bctx, 0, 0, cfg, 'down', 0);
    ctx.drawImage(buf, 0, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W * scale, FRAME_H * scale);
    return canvas;
  }
}
