import { StagesConfig } from '../../config/GameConfig';
import type { Obstacle } from '../../core/types';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { randIcon, tierType } from './util';

const O = StagesConfig.orbit;

/**
 * OrbitTower (回転オービット塔)
 * 中央の柱の周りを水平カルーセルで周回。的は手前↔奥に動き、柱の裏に回ると隠れて
 * 当てられない(柱が弾も遮る)。前に来た一瞬を狙う＝奥行きと先読みのゲーム。
 */
export class OrbitTower implements StageTemplate {
  readonly displayName = '回転オービット塔';
  readonly backgroundKey = 'farm';

  private rings: Target[][] = [];

  constructor() {
    this.rings = O.rings.map((ring) => {
      const arr: Target[] = [];
      for (let i = 0; i < ring.count; i++) {
        arr.push(this.make(ring, (i / ring.count) * Math.PI * 2));
      }
      return arr;
    });
  }

  private make(ring: (typeof O.rings)[number], angle: number): Target {
    const t = new Target({
      position: { x: 0, y: ring.cy, z: ring.z },
      radius: ring.tr,
      scoreValue: ring.score,
      type: tierType(ring.score),
      iconIndex: randIcon(),
    });
    t.phase = angle;
    return t;
  }

  update(dt: number): void {
    O.rings.forEach((ring, ri) => {
      const arr = this.rings[ri];
      for (const t of arr) {
        t.update(dt);
        t.phase += ring.speed * dt;
        // 水平カルーセル: x と z(奥行き) が回る。
        t.position.x = Math.cos(t.phase) * ring.r;
        t.position.z = ring.z + Math.sin(t.phase) * ring.r;
        t.position.y = ring.cy;
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].isDestroyed()) {
          const ang = arr[i].phase + Math.PI;
          arr.splice(i, 1);
          arr.push(this.make(ring, ang));
        }
      }
    });
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const arr of this.rings) for (const t of arr) if (!t.isDestroyed()) out.push(t);
    return out;
  }
  onHit(t: Target): number { return t.scoreValue; }
  getGuides(): GuideSegment[] { return []; }
  getObstacles(): Obstacle[] {
    return [{ ...O.pillar }];
  }
}
