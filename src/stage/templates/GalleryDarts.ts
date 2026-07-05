import { ArenaConfig, StagesConfig } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { StageTemplate } from '../StageTemplate';
import { rand, RespawnQueue, StageEventQueue, tierType } from './util';

const G = StagesConfig.gallery;

/**
 * GalleryDarts (西部の射的場)
 * 吸盤ダーツを高速連射する射的シーン。
 * - スライダー: 木の板的が2レーンで左右移動
 * - 窓ポップアップ: 建物の窓から一瞬だけ顔を出す
 * - トロッコ: レール上を速く横切る (高得点)
 * - 星 (トリガー): 屋根の上。撃つとコウモリ群が飛来する
 */
export class GalleryDarts implements StageTemplate {
  readonly displayName = '西部の射的場';
  readonly sceneId = 'gallery' as const;
  readonly weapon = Weapons.suction;

  private sliders: Target[] = [];
  private sliderRespawn = new RespawnQueue();
  private windows: { target: Target | null; timer: number }[];
  private cart: Target | null = null;
  private cartRespawn = new RespawnQueue();
  private star: Target | null = null;
  private starRespawn = new RespawnQueue();
  private bats: Target[] = [];
  private events = new StageEventQueue();

  constructor() {
    for (const lane of G.sliders) {
      for (let i = 0; i < lane.count; i++) this.sliders.push(this.makeSlider(lane));
    }
    this.windows = G.windows.spots.map(() => ({
      target: null,
      timer: Math.random() * G.windows.respawnSec,
    }));
    this.cart = this.makeCart();
    this.star = this.makeStar();
  }

  private makeSlider(lane: (typeof G.sliders)[number]): Target {
    const hw = ArenaConfig.halfWidth;
    const t = new Target({
      position: { x: (Math.random() * 2 - 1) * hw, y: lane.y, z: lane.z },
      radius: lane.radius,
      scoreValue: lane.score,
      type: tierType(lane.score),
      style: 'wood',
    });
    t.vx = lane.speed * (Math.random() < 0.5 ? -1 : 1);
    return t;
  }

  private makeCart(): Target {
    const hw = ArenaConfig.halfWidth;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const t = new Target({
      position: { x: -dir * (hw + 1), y: G.cart.y, z: G.cart.z },
      radius: G.cart.radius,
      scoreValue: G.cart.score,
      type: tierType(G.cart.score),
      style: 'cart',
    });
    t.vx = G.cart.speed * dir;
    return t;
  }

  private makeStar(): Target {
    return new Target({
      position: { x: G.star.x, y: G.star.y, z: G.star.z },
      radius: G.star.radius,
      scoreValue: G.star.score,
      type: TargetType.Trigger,
      style: 'star',
    });
  }

  private releaseBats(): void {
    const B = G.bats;
    for (let i = 0; i < B.count; i++) {
      const t = new Target({
        position: { x: rand(-B.xRange, B.xRange), y: B.baseY, z: B.z + rand(-1, 1) },
        radius: B.radius,
        scoreValue: B.score,
        type: TargetType.Bonus,
        style: 'bat',
        life: B.lifeSec,
      });
      t.phase = rand(0, Math.PI * 2);
      this.bats.push(t);
    }
    this.events.push('bats');
  }

  update(dt: number): void {
    // スライダー: 端で折り返し。
    const hw = ArenaConfig.halfWidth;
    for (const t of this.sliders) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (t.position.x > hw) { t.position.x = hw; t.vx = -Math.abs(t.vx); }
      else if (t.position.x < -hw) { t.position.x = -hw; t.vx = Math.abs(t.vx); }
    }
    this.sliders = this.sliders.filter((t) => {
      if (t.isDestroyed()) {
        this.sliderRespawn.schedule(G.sliderRespawnSec);
        return false;
      }
      return true;
    });
    this.sliderRespawn.update(dt, () => {
      const lane = G.sliders[Math.floor(Math.random() * G.sliders.length)];
      this.sliders.push(this.makeSlider(lane));
    });

    // 窓ポップアップ。
    this.windows.forEach((slot, i) => {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isIdle()) {
          slot.target.life -= dt;
          if (slot.target.life <= 0) slot.target.expire();
        }
        if (slot.target.isDestroyed()) {
          slot.target = null;
          slot.timer = G.windows.respawnSec;
        }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) {
          slot.target = new Target({
            position: { ...G.windows.spots[i] },
            radius: G.windows.radius,
            scoreValue: G.windows.score,
            type: tierType(G.windows.score),
            style: 'wood',
            life: G.windows.lifeSec,
          });
        }
      }
    });

    // トロッコ: 画面外に出たら少し待って次。
    if (this.cart) {
      this.cart.update(dt);
      this.cart.position.x += this.cart.vx * dt;
      if (Math.abs(this.cart.position.x) > hw + 1.5) this.cart.expire();
      if (this.cart.isDestroyed()) {
        this.cart = null;
        this.cartRespawn.schedule(G.cart.gapSec);
      }
    }
    this.cartRespawn.update(dt, () => {
      this.cart = this.makeCart();
    });

    // 星 (トリガー)。
    if (this.star) {
      this.star.update(dt);
      if (this.star.isDestroyed()) {
        this.star = null;
        this.starRespawn.schedule(G.starRespawnSec);
      }
    }
    this.starRespawn.update(dt, () => {
      this.star = this.makeStar();
    });

    // コウモリ: サインカーブ飛行。寿命で消える。
    const B = G.bats;
    for (const t of this.bats) {
      t.update(dt);
      t.phase += (B.speed / B.xRange) * dt;
      t.position.x = Math.sin(t.phase) * B.xRange;
      t.position.y = B.baseY + Math.sin(t.phase * 2.7) * B.amp;
      if (t.isIdle()) {
        t.life -= dt;
        if (t.life <= 0) t.expire();
      }
    }
    this.bats = this.bats.filter((t) => !t.isDestroyed());
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    out.push(...this.sliders.filter((t) => !t.isDestroyed()));
    for (const s of this.windows) {
      if (s.target && !s.target.isDestroyed()) out.push(s.target);
    }
    if (this.cart && !this.cart.isDestroyed()) out.push(this.cart);
    if (this.star && !this.star.isDestroyed()) out.push(this.star);
    out.push(...this.bats);
    return out;
  }

  onHit(t: Target): number {
    if (t === this.star) this.releaseBats();
    return t.scoreValue;
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
