import { StagesConfig } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import type { SceneProp } from '../Scene';
import { Target } from '../../target/Target';
import { BonusBurst } from './BonusBurst';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { FixedTrigger, randIcon, tierType } from './util';

const T = StagesConfig.tiers;

/**
 * Tiers (ひな壇シューティング)
 * 手前から奥へ段が上がる台。各段に的が乗って左右スライド。
 * 奥の段ほど高く・小さく・速く・高得点。右端に固定の隠しトリガー。
 */
export class Tiers implements StageTemplate {
  readonly displayName = 'ひな壇';
  readonly backgroundKey = 'farm';

  /** step index ごとの的配列。 */
  private rows: Target[][] = [];
  private pending: { step: number; timer: number }[] = [];
  private burst = new BonusBurst();
  private trigger = new FixedTrigger(T.trigger);

  constructor() {
    this.rows = T.steps.map((step, si) => {
      const arr: Target[] = [];
      for (let i = 0; i < step.count; i++) arr.push(this.make(si));
      return arr;
    });
  }

  private make(si: number): Target {
    const s = T.steps[si];
    const z = (s.zNear + s.zFar) / 2;
    const t = new Target({
      position: { x: (Math.random() * 2 - 1) * (s.halfWidth - s.tr), y: s.y + s.tr, z },
      radius: s.tr,
      scoreValue: s.score,
      type: tierType(s.score),
      iconIndex: randIcon(),
    });
    t.vx = s.speed * (Math.random() < 0.5 ? -1 : 1);
    return t;
  }

  update(dt: number): void {
    T.steps.forEach((s, si) => {
      const arr = this.rows[si];
      const lim = s.halfWidth - s.tr;
      for (const t of arr) {
        t.update(dt);
        t.position.x += t.vx * dt;
        if (t.position.x > lim) { t.position.x = lim; t.vx = -Math.abs(t.vx); }
        else if (t.position.x < -lim) { t.position.x = -lim; t.vx = Math.abs(t.vx); }
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].isDestroyed()) {
          arr.splice(i, 1);
          this.pending.push({ step: si, timer: T.respawn });
        }
      }
    });
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i].timer -= dt;
      if (this.pending[i].timer <= 0) {
        const p = this.pending.splice(i, 1)[0];
        this.rows[p.step].push(this.make(p.step));
      }
    }
    this.trigger.update(dt);
    this.burst.update(dt);
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const arr of this.rows) for (const t of arr) if (!t.isDestroyed()) out.push(t);
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

  getProps(): SceneProp[] {
    // 各段を床から立ち上がる板として描く。手前段の下端=床、奥段の下端=手前段の上面。
    return T.steps.map((s, si) => ({
      kind: 'platform' as const,
      base: { x: 0, y: s.y, z: s.zNear },
      zFar: s.zFar,
      halfWidth: s.halfWidth,
      yBottom: si === 0 ? T.floorY : T.steps[si - 1].y,
      color: `rgba(${120 - si * 14}, ${150 - si * 10}, ${110 + si * 8}, 0.92)`,
      edge: 'rgba(40,60,40,0.7)',
    }));
  }
}
