import { ArenaConfig, StagesConfig } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { StageTemplate } from '../StageTemplate';
import { RespawnQueue, StageEventQueue, tierType } from './util';

const B = StagesConfig.bonus;

/**
 * BonusRound (ボーナスラウンド) = 最終シーン
 * 吸盤ダーツ連射でスコアを一気に稼ぐフィナーレ。
 * - トロッコ2レーンが高速で横切る
 * - 出没的が高頻度でポップアップ
 * - 中央の「成長ターゲット」: 撃つたび得点が上がり (500→…→5000)、
 *   的は小さくなる。最小まで縮むとフィニッシュして再出現。
 */
export class BonusRound implements StageTemplate {
  readonly displayName = 'ボーナスラウンド';
  readonly sceneId = 'bonus' as const;
  readonly weapon = Weapons.suction;

  private carts: (Target | null)[];
  private cartRespawn: RespawnQueue[];
  private popups: { target: Target | null; timer: number }[];
  private grow: Target | null = null;
  private growRespawn = new RespawnQueue();
  private events = new StageEventQueue();

  constructor() {
    this.carts = B.carts.map((lane) => this.makeCart(lane));
    this.cartRespawn = B.carts.map(() => new RespawnQueue());
    this.popups = B.popups.spots.map(() => ({
      target: null,
      timer: Math.random() * B.popups.respawnSec,
    }));
    this.spawnGrow();
  }

  private makeCart(lane: (typeof B.carts)[number]): Target {
    const hw = ArenaConfig.halfWidth;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const t = new Target({
      position: { x: -dir * (hw + 1), y: lane.y, z: lane.z },
      radius: lane.radius,
      scoreValue: lane.score,
      type: tierType(lane.score),
      style: 'cart',
    });
    t.vx = lane.speed * dir;
    return t;
  }

  private spawnGrow(): void {
    const G = B.grow;
    this.grow = new Target({
      position: { x: G.x, y: G.y, z: G.z },
      radius: G.startRadius,
      scoreValue: G.startValue,
      type: TargetType.Bonus,
      style: 'grow',
    });
  }

  update(dt: number): void {
    const hw = ArenaConfig.halfWidth;

    // トロッコ: 画面外に出たら少し待って次。
    this.carts.forEach((cart, i) => {
      if (cart) {
        cart.update(dt);
        cart.position.x += cart.vx * dt;
        if (Math.abs(cart.position.x) > hw + 1.5) cart.expire();
        if (cart.isDestroyed()) {
          this.carts[i] = null;
          this.cartRespawn[i].schedule(B.carts[i].gapSec);
        }
      }
      this.cartRespawn[i].update(dt, () => {
        this.carts[i] = this.makeCart(B.carts[i]);
      });
    });

    // ポップアップ。
    this.popups.forEach((slot, i) => {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isIdle()) {
          slot.target.life -= dt;
          if (slot.target.life <= 0) slot.target.expire();
        }
        if (slot.target.isDestroyed()) {
          slot.target = null;
          slot.timer = B.popups.respawnSec;
        }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) {
          slot.target = new Target({
            position: { ...B.popups.spots[i] },
            radius: B.popups.radius,
            scoreValue: B.popups.score,
            type: tierType(B.popups.score),
            style: 'bullseye',
            life: B.popups.lifeSec,
          });
        }
      }
    });

    // 成長ターゲット。
    if (this.grow) {
      this.grow.update(dt);
      if (this.grow.isDestroyed()) {
        this.grow = null;
        this.growRespawn.schedule(B.grow.respawnSec);
      }
    }
    this.growRespawn.update(dt, () => this.spawnGrow());
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const c of this.carts) if (c && !c.isDestroyed()) out.push(c);
    for (const s of this.popups) {
      if (s.target && !s.target.isDestroyed()) out.push(s.target);
    }
    if (this.grow && !this.grow.isDestroyed()) out.push(this.grow);
    return out;
  }

  onHit(t: Target): number {
    // 成長ターゲット: 撃つほど得点UP＆縮小。最小まで縮むとフィニッシュ。
    if (t === this.grow) {
      const G = B.grow;
      const awarded = t.scoreValue;
      const next = t.radius - G.shrink;
      if (next > G.minRadius && t.scoreValue < G.maxValue) {
        t.scoreValue = Math.min(G.maxValue, t.scoreValue + G.increment);
        t.radius = next;
        t.revive(); // まだ撃てる
      } else {
        this.events.push('growFinish');
      }
      // revive しなければ Hit → Destroyed → respawn される。
      return awarded;
    }
    return t.scoreValue;
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
