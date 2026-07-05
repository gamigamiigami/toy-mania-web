import { StagesConfig } from '../../config/GameConfig';
import {
  TargetType,
  type Obstacle,
  type StageEventKind,
} from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { SceneState, StageTemplate } from '../StageTemplate';
import { rand, RespawnQueue, StageEventQueue, tierType } from './util';

const R = StagesConfig.rings;

/**
 * RingToss (リングトス宇宙港)
 * ふわりと飛ぶ輪を、中央ロケットの周りを周回するエイリアン風の的に投げる。
 * ロケットは弾を遮る柱。裏に回った的には当てられない＝先読みのゲーム。
 * ロボットの胸コア (トリガー) を撃つとロケットが発射され、ボーナス的が出現。
 */
export class RingToss implements StageTemplate {
  readonly displayName = 'リングトス宇宙港';
  readonly sceneId = 'rings' as const;
  readonly weapon = Weapons.ring;

  private orbits: Target[][] = [];
  private core: Target | null = null;
  private coreRespawn = new RespawnQueue();
  private bonus: Target[] = [];
  /** ロケット発射演出の経過 (0=待機, 0..1 上昇中, 1で戻る)。 */
  private rocketLift = 0;
  private lifting = false;
  private events = new StageEventQueue();

  constructor() {
    this.orbits = R.orbits.map((ring) => {
      const arr: Target[] = [];
      for (let i = 0; i < ring.count; i++) {
        arr.push(this.makeOrbiter(ring, (i / ring.count) * Math.PI * 2));
      }
      return arr;
    });
    this.core = this.makeCore();
  }

  private makeOrbiter(ring: (typeof R.orbits)[number], angle: number): Target {
    const t = new Target({
      position: { x: 0, y: ring.cy, z: ring.z },
      radius: ring.radius,
      scoreValue: ring.score,
      type: tierType(ring.score),
      style: 'alien',
    });
    t.phase = angle;
    return t;
  }

  private makeCore(): Target {
    return new Target({
      position: { x: R.core.x, y: R.core.y, z: R.core.z },
      radius: R.core.radius,
      scoreValue: R.core.score,
      type: TargetType.Trigger,
      style: 'core',
    });
  }

  private launchRocket(): void {
    this.lifting = true;
    const L = R.launchBonus;
    for (let i = 0; i < L.count; i++) {
      this.bonus.push(
        new Target({
          position: {
            x: rand(-L.xRange, L.xRange),
            y: rand(L.y[0], L.y[1]),
            z: L.z + rand(-0.8, 0.8),
          },
          radius: L.radius,
          scoreValue: L.score,
          type: TargetType.Bonus,
          style: 'alien',
          life: L.lifeSec,
        }),
      );
    }
    this.events.push('rocket');
  }

  update(dt: number): void {
    R.orbits.forEach((ring, ri) => {
      const arr = this.orbits[ri];
      for (const t of arr) {
        t.update(dt);
        t.phase += ring.speed * dt;
        // 水平カルーセル: x と z(奥行き) が回る。ロケットの裏では隠れる。
        t.position.x = Math.cos(t.phase) * ring.r;
        t.position.z = ring.z + Math.sin(t.phase) * ring.r;
        t.position.y = ring.cy;
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].isDestroyed()) {
          const ang = arr[i].phase + Math.PI;
          arr.splice(i, 1);
          arr.push(this.makeOrbiter(ring, ang));
        }
      }
    });

    if (this.core) {
      this.core.update(dt);
      if (this.core.isDestroyed()) {
        this.core = null;
        this.coreRespawn.schedule(R.coreRespawnSec);
      }
    }
    this.coreRespawn.update(dt, () => {
      this.core = this.makeCore();
    });

    for (const b of this.bonus) {
      b.update(dt);
      if (b.isIdle()) {
        b.life -= dt;
        if (b.life <= 0) b.expire();
      }
    }
    this.bonus = this.bonus.filter((b) => !b.isDestroyed());

    // ロケット発射演出: 上昇して戻る。
    if (this.lifting) {
      this.rocketLift += dt * 0.5;
      if (this.rocketLift >= 1) {
        this.rocketLift = 0;
        this.lifting = false;
      }
    }
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const arr of this.orbits) {
      for (const t of arr) if (!t.isDestroyed()) out.push(t);
    }
    if (this.core && !this.core.isDestroyed()) out.push(this.core);
    out.push(...this.bonus);
    return out;
  }

  onHit(t: Target): number {
    if (t === this.core) this.launchRocket();
    return t.scoreValue;
  }

  getObstacles(): Obstacle[] {
    // 発射中はロケットが上へ抜けるので遮らない。
    if (this.lifting) return [];
    return [{ x: R.rocket.x, y: R.rocket.y, z: R.rocket.z, radius: R.rocket.radius }];
  }

  getSceneState(): SceneState {
    return { rocketLift: this.rocketLift };
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
