import { StagesConfig } from '../../config/GameConfig';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { randIcon, tierType } from './util';

const O = StagesConfig.orbit;

/**
 * OrbitTower (回転オービット塔)
 * 複数のリング上を的が3D周回。奥のリングほど小さく高得点。先読み+ロブ。
 */
export class OrbitTower implements StageTemplate {
  readonly displayName = '回転オービット塔';
  readonly backgroundKey = 'farm';

  /** ring index ごとの的配列。 */
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
        t.position.x = Math.cos(t.phase) * ring.r;
        t.position.y = ring.cy + Math.sin(t.phase) * (ring.r * 0.45);
      }
      // 破壊→反対側から復帰。
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
}
