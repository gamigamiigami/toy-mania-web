import { PhotoFarmConfig, TargetConfig } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';

interface Slot {
  index: number;
  target: Target | null;
  timer: number;
}

/**
 * PhotoFarm
 * 責務: 背景画像の上に、固定3D位置(奥行きでサイズ差)の的スプライトを並べる。
 *       命中すると消滅し、3秒後に同じ位置へ再出現する。
 */
export class PhotoFarm implements StageTemplate {
  readonly displayName = 'Farm';
  /** Renderer に背景画像を使うよう伝えるキー。 */
  readonly backgroundKey = 'farm';
  private slots: Slot[];

  constructor() {
    this.slots = PhotoFarmConfig.slots.map((_, index) => ({
      index,
      target: this.makeTarget(index),
      timer: 0,
    }));
  }

  private makeTarget(index: number): Target {
    const s = PhotoFarmConfig.slots[index];
    // アイコンによって得点に少し差をつける(HighValueは奥の小さい的)。
    return new Target({
      position: { x: s.x, y: s.y, z: s.z },
      type: TargetType.Normal,
      iconIndex: s.icon,
      radius: TargetConfig.radius,
    });
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isDestroyed()) {
          slot.target = null;
          slot.timer = PhotoFarmConfig.respawnSec;
        }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) slot.target = this.makeTarget(slot.index);
      }
    }
  }

  getTargets(): Target[] {
    return this.slots
      .map((s) => s.target)
      .filter((t): t is Target => t !== null && !t.isDestroyed());
  }

  onHit(target: Target): number {
    return target.scoreValue;
  }

  getGuides(): GuideSegment[] {
    return [];
  }
}
