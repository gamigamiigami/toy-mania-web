import { StagesConfig } from '../../config/GameConfig';
import type { Obstacle } from '../../core/types';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { randIcon, tierType } from './util';

const C = StagesConfig.curve;

/**
 * CurveCourse (カーブ迫りコース)
 * 障害物が直進弾を遮るので、斜めスワイプのカーブで裏の的を狙う。
 */
export class CurveCourse implements StageTemplate {
  readonly displayName = 'カーブ迫りコース';
  readonly backgroundKey = 'farm';

  private slots: { target: Target | null; timer: number; index: number }[];

  constructor() {
    this.slots = C.targets.map((_, index) => ({
      target: this.make(index),
      timer: 0,
      index,
    }));
  }

  private make(index: number): Target {
    const s = C.targets[index];
    return new Target({
      position: { x: s.x, y: s.y, z: s.z },
      radius: C.tr,
      scoreValue: s.score,
      type: tierType(s.score),
      iconIndex: randIcon(),
    });
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isDestroyed()) { slot.target = null; slot.timer = C.respawn; }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) slot.target = this.make(slot.index);
      }
    }
  }

  getTargets(): Target[] {
    return this.slots
      .map((s) => s.target)
      .filter((t): t is Target => t !== null && !t.isDestroyed());
  }
  onHit(t: Target): number { return t.scoreValue; }
  getGuides(): GuideSegment[] { return []; }
  getObstacles(): Obstacle[] {
    return C.obstacles.map((o) => ({ ...o }));
  }
}
