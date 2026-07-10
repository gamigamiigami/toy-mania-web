import { StagesConfig } from '../../config/GameConfig';
import { TargetType, type Obstacle } from '../../core/types';
import { Target } from '../../target/Target';
import { BonusBurst } from './BonusBurst';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { FixedTrigger, randIcon, tierType } from './util';

const O = StagesConfig.orbit;

/**
 * OrbitTower (回転オービット塔)
 * 中央の柱の周りを水平カルーセルで周回。的は手前↔奥に動き、柱の裏に回ると隠れて
 * 当てられない(柱が弾も遮る)。塔のてっぺんに固定の隠しトリガー。
 */
export class OrbitTower implements StageTemplate {
  readonly displayName = '回転オービット塔';
  readonly backgroundKey = 'farm';

  private rings: Target[][] = [];
  private burst = new BonusBurst();
  private trigger = new FixedTrigger(O.trigger);

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
    this.trigger.update(dt);
    this.burst.update(dt);
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const arr of this.rings) for (const t of arr) if (!t.isDestroyed()) out.push(t);
    out.push(...this.trigger.targets());
    out.push(...this.burst.targets());
    return out;
  }
  onHit(t: Target): number {
    if (t.type === TargetType.Trigger) this.burst.spawn(t.position.x, t.position.z);
    return t.scoreValue;
  }
  onCoopTrigger(): void {
    this.burst.spawnMega();
  }
  getGuides(): GuideSegment[] { return []; }
  getObstacles(): Obstacle[] {
    return [{ ...O.pillar }];
  }
}
