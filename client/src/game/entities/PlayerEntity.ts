import Phaser from 'phaser';
import { Player as PlayerData, AvatarConfig, Direction, CONSTANTS, STATUS_COLORS } from '../../types';
import { SpriteFactory } from '../utils/SpriteFactory';

export interface PlayerVisualOpts {
  isLocal?: boolean;
}

/**
 * Wrapper visual de un jugador (local o remoto). Maneja sprite, label,
 * indicadores de estado, halo de "hablando" y animaciones.
 */
export class PlayerEntity {
  scene: Phaser.Scene;
  data: PlayerData;
  isLocal: boolean;

  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  micIcon: Phaser.GameObjects.Text;
  speakingHalo: Phaser.GameObjects.Graphics;
  emoteText?: Phaser.GameObjects.Text;
  emoteTween?: Phaser.Tweens.Tween;

  // Interpolación de posición (remotos)
  targetX: number;
  targetY: number;
  speaking = false;

  constructor(scene: Phaser.Scene, data: PlayerData, opts: PlayerVisualOpts = {}) {
    this.scene = scene;
    this.data = data;
    this.isLocal = !!opts.isLocal;
    this.targetX = data.x;
    this.targetY = data.y;

    const key = SpriteFactory.ensureAvatar(scene, data.avatar);
    this.sprite = scene.add.sprite(data.x, data.y, key, 0)
      .setDepth(100)
      .setOrigin(0.5, 0.85);

    this.label = scene.add.text(data.x, data.y - 56, data.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: { x: 6, y: 2 },
      fontStyle: '600',
    }).setOrigin(0.5).setDepth(101);

    this.micIcon = scene.add.text(data.x + 14, data.y - 54, '🔇', {
      fontSize: '12px',
    }).setOrigin(0.5).setDepth(102);

    this.speakingHalo = scene.add.graphics().setDepth(99);
    this.refreshHalo();

    this.playIdle(data.direction);
  }

  // -----------------------------------------------------------------
  // ANIMACIONES
  // -----------------------------------------------------------------
  playIdle(dir: Direction = this.data.direction) {
    const key = SpriteFactory.keyFor(this.data.avatar);
    const animKey = `${key}_idle_${dir}`;
    if (this.scene.anims.exists(animKey) && this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey);
    }
  }
  playWalk(dir: Direction) {
    const key = SpriteFactory.keyFor(this.data.avatar);
    const animKey = `${key}_walk_${dir}`;
    if (this.scene.anims.exists(animKey) && this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey);
    }
  }

  setDirection(dir: Direction, moving: boolean) {
    this.data.direction = dir;
    this.data.moving = moving;
    if (moving) this.playWalk(dir);
    else this.playIdle(dir);
  }

  // -----------------------------------------------------------------
  // POSICIÓN
  // -----------------------------------------------------------------
  setTarget(x: number, y: number) { this.targetX = x; this.targetY = y; }
  setPositionInstant(x: number, y: number) {
    this.data.x = x; this.data.y = y;
    this.targetX = x; this.targetY = y;
    this.sprite.setPosition(x, y);
  }

  /** Interpolación suave hacia (targetX, targetY) – llamar desde update */
  tick(deltaMs: number) {
    if (!this.isLocal) {
      const lerp = Math.min(1, deltaMs / 80);
      this.data.x = Phaser.Math.Linear(this.data.x, this.targetX, lerp);
      this.data.y = Phaser.Math.Linear(this.data.y, this.targetY, lerp);
      this.sprite.setPosition(this.data.x, this.data.y);
      // Auto idle si lleva quieto
      const dist = Math.hypot(this.targetX - this.data.x, this.targetY - this.data.y);
      if (dist < 1 && this.sprite.anims.currentAnim?.key.includes('walk')) {
        this.playIdle(this.data.direction);
      }
    } else {
      this.sprite.setPosition(this.data.x, this.data.y);
    }
    this.label.setPosition(this.data.x, this.data.y - 56);
    this.micIcon.setPosition(this.data.x + 18, this.data.y - 54);
    if (this.speaking) {
      this.speakingHalo.setPosition(this.data.x, this.data.y - 6);
    } else {
      this.speakingHalo.clear();
    }
    if (this.emoteText) {
      this.emoteText.setPosition(this.data.x, this.data.y - 70);
    }
  }

  // -----------------------------------------------------------------
  // INDICADORES
  // -----------------------------------------------------------------
  setSpeaking(speaking: boolean) {
    this.speaking = speaking;
    this.refreshHalo();
  }
  private refreshHalo() {
    this.speakingHalo.clear();
    if (this.speaking) {
      this.speakingHalo.lineStyle(3, 0x4ade80, 0.85);
      this.speakingHalo.strokeCircle(0, 0, 22);
      this.speakingHalo.lineStyle(2, 0x4ade80, 0.45);
      this.speakingHalo.strokeCircle(0, 0, 28);
      this.speakingHalo.setPosition(this.data.x, this.data.y - 6);
    }
  }

  setMicCam(micOn: boolean, camOn: boolean) {
    this.data.micOn = micOn;
    this.data.camOn = camOn;
    this.micIcon.setText(micOn ? '🎤' : '🔇');
  }

  setStatus(status: PlayerData['status']) {
    this.data.status = status;
    const color = STATUS_COLORS[status];
    this.label.setColor(color);
  }

  setName(name: string) {
    this.data.name = name;
    this.label.setText(name);
  }

  setAvatar(cfg: AvatarConfig) {
    this.data.avatar = cfg;
    const key = SpriteFactory.ensureAvatar(this.scene, cfg);
    this.sprite.setTexture(key, 0);
    this.playIdle(this.data.direction);
  }

  showEmote(emote: string) {
    if (this.emoteTween) this.emoteTween.stop();
    if (this.emoteText) this.emoteText.destroy();
    this.emoteText = this.scene.add.text(this.data.x, this.data.y - 70, emote, {
      fontSize: '28px',
    }).setOrigin(0.5).setDepth(200);
    this.emoteTween = this.scene.tweens.add({
      targets: this.emoteText,
      y: this.data.y - 110,
      alpha: 0,
      duration: 1800,
      onComplete: () => { this.emoteText?.destroy(); this.emoteText = undefined; },
    });
  }

  destroy() {
    this.sprite.destroy();
    this.label.destroy();
    this.micIcon.destroy();
    this.speakingHalo.destroy();
    this.emoteText?.destroy();
  }
}
