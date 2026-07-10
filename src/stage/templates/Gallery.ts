import { ArenaConfig, StagesConfig } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import { BonusBurst } from './BonusBurst';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { FixedTrigger, randIcon, tierType } from './util';

const G = StagesConfig.gallery;

/**
 * Gallery (3層ギャラリー)
 * 手前=左右スライド(低得点) / 中=穴からポップアップ(中得点) / 奥=オービット(高得点)。
 * カルーセルの上に固定の隠しトリガー。
 */
export class Gallery implements StageTemplate {
  readonly displayName = '3層ギャラリー';
  readonly backgroundKey = 'farm';

  private near: Target[] = [];
  private nearPending: number[] = [];
  private holes: { target: Target | null; timer: number }[];
  private far: Target[] = [];
  private farPending: number[] = [];
  private burst = new BonusBurst();
  private trigger = new FixedTrigger(G.trigger);

  constructor() {
    for (let i = 0; i < G.near.count; i++) this.near.push(this.makeNear());
    this.holes = G.midHoles.map(() => ({ target: null, timer: Math.random() * G.midRespawn }));
    for (let i = 0; i < G.far.count; i++) this.far.push(this.makeFar(Math.random() * Math.PI * 2));
  }

  private makeNear(): Target {
    const hw = ArenaConfig.halfWidth;
    const t = new Target({
      position: { x: (Math.random() * 2 - 1) * hw, y: G.near.y, z: G.near.z },
      scoreValue: G.near.score,
      type: tierType(G.near.score),
      iconIndex: randIcon(),
    });
    t.vx = G.near.speed * (Math.random() < 0.5 ? -1 : 1);
    return t;
  }

  private makeFar(angle: number): Target {
    const t = new Target({
      position: { x: 0, y: 0, z: G.far.z },
      radius: G.far.tr,
      scoreValue: G.far.score,
      type: tierType(G.far.score),
      iconIndex: randIcon(),
    });
    t.phase = angle;
    return t;
  }

  update(dt: number): void {
    const hw = ArenaConfig.halfWidth;
    // 手前スライド
    for (const t of this.near) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (t.position.x > hw) { t.position.x = hw; t.vx = -Math.abs(t.vx); }
      else if (t.position.x < -hw) { t.position.x = -hw; t.vx = Math.abs(t.vx); }
    }
    this.near = this.collect(this.near, this.nearPending, G.midRespawn);
    this.spawnPending(this.nearPending, dt, () => this.near.push(this.makeNear()));

    // 中ポップアップ
    for (const slot of this.holes) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isIdle()) {
          slot.target.life -= dt;
          if (slot.target.life <= 0) slot.target.expire();
        }
        if (slot.target.isDestroyed()) { slot.target = null; slot.timer = G.midRespawn; }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) {
          const h = G.midHoles[this.holes.indexOf(slot)];
          slot.target = new Target({
            position: { ...h }, life: G.midLife,
            scoreValue: G.midScore,
            type: tierType(G.midScore),
            iconIndex: randIcon(),
          });
        }
      }
    }

    // 奥カルーセル (X-Z 平面: 手前↔奥に動く)
    for (const t of this.far) {
      t.update(dt);
      t.phase += G.far.speed * dt;
      t.position.x = G.far.cx + Math.cos(t.phase) * G.far.radius;
      t.position.z = G.far.z + Math.sin(t.phase) * G.far.radius;
      t.position.y = G.far.cy;
    }
    this.far = this.collect(this.far, this.farPending, G.midRespawn);
    this.spawnPending(this.farPending, dt, () =>
      this.far.push(this.makeFar(Math.random() * Math.PI * 2)),
    );

    this.trigger.update(dt);
    this.burst.update(dt);
  }

  /** 破壊された的を取り除き、再出現を予約。 */
  private collect(list: Target[], pending: number[], delay: number): Target[] {
    const alive: Target[] = [];
    for (const t of list) {
      if (t.isDestroyed()) pending.push(delay);
      else alive.push(t);
    }
    return alive;
  }
  private spawnPending(pending: number[], dt: number, spawn: () => void): void {
    for (let i = pending.length - 1; i >= 0; i--) {
      pending[i] -= dt;
      if (pending[i] <= 0) { pending.splice(i, 1); spawn(); }
    }
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const t of this.near) if (!t.isDestroyed()) out.push(t);
    for (const s of this.holes) if (s.target && !s.target.isDestroyed()) out.push(s.target);
    for (const t of this.far) if (!t.isDestroyed()) out.push(t);
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
}
