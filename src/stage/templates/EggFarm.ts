import { ArenaConfig, StagesConfig } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { SceneState, StageTemplate } from '../StageTemplate';
import { lerp, RespawnQueue, StageEventQueue, tierType } from './util';

const E = StagesConfig.eggfarm;

interface Weasel {
  target: Target;
  spot: number;
  state: 'rise' | 'hold' | 'sink';
  t: number;
}

/**
 * EggFarm (たまご牧場)
 * 卵を山なりに投げ込む牧場シーン。
 * - イタチ: 手前の柵から出没 (モグラ式)
 * - ブタ/ヒツジ: 地面を左右に歩く板的
 * - トリ: サインカーブで空を飛ぶ (高得点)
 * - キツネ (トリガー): 納屋の屋根。撃つと扉が開き1000点ニワトリが飛び出す
 */
export class EggFarm implements StageTemplate {
  readonly displayName = 'たまご牧場';
  readonly sceneId = 'eggfarm' as const;
  readonly weapon = Weapons.egg;

  private weasels: Weasel[] = [];
  private occupiedSpots = new Set<number>();
  private weaselRespawn = new RespawnQueue();
  private walkers: Target[] = [];
  private walkerRespawn = new RespawnQueue();
  private flyers: Target[] = [];
  private fox: Target | null = null;
  private foxRespawn = new RespawnQueue();
  private chickens: Target[] = [];
  /** 扉の開き具合 0..1。ニワトリ出現中は開く。 */
  private doorOpen = 0;
  private windmillAngle = 0;
  private events = new StageEventQueue();

  constructor() {
    for (let i = 0; i < E.weasels.active; i++) this.spawnWeasel();
    for (const lane of E.walkers) {
      for (let i = 0; i < lane.count; i++) this.walkers.push(this.makeWalker(lane));
    }
    for (let i = 0; i < E.flyers.count; i++) {
      this.flyers.push(this.makeFlyer((i / E.flyers.count) * Math.PI * 2));
    }
    this.fox = this.makeFox();
  }

  private spawnWeasel(): void {
    const free: number[] = [];
    E.weasels.spots.forEach((_, i) => {
      if (!this.occupiedSpots.has(i)) free.push(i);
    });
    if (free.length === 0) return;
    const spot = free[Math.floor(Math.random() * free.length)];
    const s = E.weasels.spots[spot];
    const t = new Target({
      position: { x: s.x, y: E.weasels.yDown, z: s.z },
      radius: E.weasels.radius,
      scoreValue: E.weasels.score,
      type: tierType(E.weasels.score),
      style: 'weasel',
    });
    this.occupiedSpots.add(spot);
    this.weasels.push({ target: t, spot, state: 'rise', t: 0 });
  }

  private makeWalker(lane: (typeof E.walkers)[number]): Target {
    const hw = ArenaConfig.halfWidth;
    const t = new Target({
      position: { x: (Math.random() * 2 - 1) * hw, y: lane.y, z: lane.z },
      scoreValue: lane.score,
      type: tierType(lane.score),
      style: lane.style,
    });
    t.vx = lane.speed * (Math.random() < 0.5 ? -1 : 1);
    return t;
  }

  private makeFlyer(phase: number): Target {
    const t = new Target({
      position: { x: 0, y: E.flyers.baseY, z: E.flyers.z },
      radius: E.flyers.radius,
      scoreValue: E.flyers.score,
      type: tierType(E.flyers.score),
      style: 'bird',
    });
    t.phase = phase;
    return t;
  }

  private makeFox(): Target {
    return new Target({
      position: { x: E.fox.x, y: E.fox.y, z: E.fox.z },
      radius: E.fox.radius,
      scoreValue: E.fox.score,
      type: TargetType.Trigger,
      style: 'fox',
    });
  }

  private releaseChickens(): void {
    for (const pos of E.chickens.positions) {
      this.chickens.push(
        new Target({
          position: { ...pos },
          radius: E.chickens.radius,
          scoreValue: E.chickens.score,
          type: TargetType.Bonus,
          style: 'chicken',
          life: E.chickens.windowSec,
        }),
      );
    }
  }

  update(dt: number): void {
    this.windmillAngle += dt * 1.2;

    // イタチ: rise → hold → sink で出没。
    const W = E.weasels;
    for (const w of this.weasels) {
      w.target.update(dt);
      if (w.target.isDestroyed()) continue;
      w.t += dt;
      if (w.state === 'rise') {
        w.target.position.y = lerp(W.yDown, W.yUp, w.t / W.riseSec);
        if (w.t >= W.riseSec) { w.state = 'hold'; w.t = 0; }
      } else if (w.state === 'hold') {
        if (w.t >= W.holdSec) { w.state = 'sink'; w.t = 0; }
      } else {
        w.target.position.y = lerp(W.yUp, W.yDown, w.t / W.sinkSec);
        if (w.t >= W.sinkSec) w.target.expire();
      }
    }
    this.weasels = this.weasels.filter((w) => {
      if (w.target.isDestroyed()) {
        this.occupiedSpots.delete(w.spot);
        this.weaselRespawn.schedule(W.gapSec);
        return false;
      }
      return true;
    });
    this.weaselRespawn.update(dt, () => this.spawnWeasel());

    // ブタ/ヒツジ: 左右に歩き、端で折り返す。
    const hw = ArenaConfig.halfWidth;
    for (const t of this.walkers) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (t.position.x > hw) { t.position.x = hw; t.vx = -Math.abs(t.vx); }
      else if (t.position.x < -hw) { t.position.x = -hw; t.vx = Math.abs(t.vx); }
    }
    this.walkers = this.walkers.filter((t) => {
      if (t.isDestroyed()) {
        this.walkerRespawn.schedule(E.walkerRespawnSec);
        return false;
      }
      return true;
    });
    this.walkerRespawn.update(dt, () => {
      const lane = E.walkers[Math.floor(Math.random() * E.walkers.length)];
      this.walkers.push(this.makeWalker(lane));
    });

    // トリ: サインカーブ飛行 (往復)。
    const F = E.flyers;
    for (const t of this.flyers) {
      t.update(dt);
      t.phase += (F.speed / F.xRange) * dt;
      t.position.x = Math.sin(t.phase) * F.xRange;
      t.position.y = F.baseY + Math.sin(t.phase * 2.3) * F.amp;
    }
    this.flyers = this.flyers.filter((t) => !t.isDestroyed());
    while (this.flyers.length < F.count) {
      this.flyers.push(this.makeFlyer(Math.random() * Math.PI * 2));
    }

    // キツネ (トリガー): 撃たれたら一定時間後に再登場。
    if (this.fox) {
      this.fox.update(dt);
      if (this.fox.isDestroyed()) {
        this.fox = null;
        this.foxRespawn.schedule(E.foxRespawnSec);
      }
    }
    this.foxRespawn.update(dt, () => {
      this.fox = this.makeFox();
    });

    // ニワトリ (ボーナス): 出現時間で消滅。残っている間は扉が開く。
    for (const c of this.chickens) {
      c.update(dt);
      if (c.isIdle()) {
        c.life -= dt;
        if (c.life <= 0) c.expire();
      }
    }
    this.chickens = this.chickens.filter((c) => !c.isDestroyed());
    const doorTarget = this.chickens.length > 0 ? 1 : 0;
    this.doorOpen += (doorTarget - this.doorOpen) * Math.min(1, dt * 6);
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const w of this.weasels) if (!w.target.isDestroyed()) out.push(w.target);
    for (const t of this.walkers) if (!t.isDestroyed()) out.push(t);
    for (const t of this.flyers) if (!t.isDestroyed()) out.push(t);
    if (this.fox && !this.fox.isDestroyed()) out.push(this.fox);
    out.push(...this.chickens);
    return out;
  }

  onHit(t: Target): number {
    // キツネ命中 → 扉が開いてニワトリ解放 (発見の報酬)。
    if (t === this.fox) {
      this.releaseChickens();
      this.events.push('door');
    }
    return t.scoreValue;
  }

  getSceneState(): SceneState {
    return { doorOpen: this.doorOpen, windmill: this.windmillAngle };
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
