import { TargetConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';
import type { Stage } from '../stage/Stage';
import { Target } from './Target';

/** 固定スロット: 同じ位置に的を維持し、命中後は遅延して同位置に再出現。 */
interface Slot {
  point: Vec3;
  target: Target | null;
  timer: number;
}

/**
 * TargetManager
 * 責務: ステージが定める固定位置に静止ターゲットを維持する。
 *       命中したら同じ位置へ再出現させ、距離ごとの練習を続けられるようにする。
 */
export class TargetManager {
  private readonly slots: Slot[];

  constructor(stage: Stage) {
    this.slots = stage.getSpawnPoints().map((point) => ({
      point,
      target: new Target({ ...point }),
      timer: 0,
    }));
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isDestroyed()) {
          slot.target = null;
          slot.timer = TargetConfig.respawnDelaySec;
        }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) {
          slot.target = new Target({ ...slot.point });
        }
      }
    }
  }

  getTargets(): Target[] {
    return this.slots
      .map((s) => s.target)
      .filter((t): t is Target => t !== null);
  }
}
