import { ProjectileConfig } from '../config/GameConfig';
import type { Vec2 } from '../core/types';

/** Trail を構成する点 (経過時間つき)。 */
export interface TrailPoint {
  pos: Vec2;
  age: number;
}

/**
 * Projectile
 * 責務: 1個の弾。速度と重力で移動する実体弾。
 *       gravity=0 なら直進、gravity>0 なら放物線になる (モードは発射側で決定)。
 *       軌跡 (Trail) を保持し、外した方向を線として残す。
 */
export class Projectile {
  readonly position: Vec2;
  private readonly velocity: Vec2;
  private readonly gravity: number;
  readonly radius: number;
  readonly trail: TrailPoint[] = [];
  private age = 0;
  private alive = true;

  constructor(position: Vec2, velocity: Vec2, gravity: number, radius: number) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.gravity = gravity;
    this.radius = radius;
  }

  update(dt: number): void {
    // 重力で下向きに加速 (y は下が正)。linear モードでは gravity=0。
    this.velocity.y += this.gravity * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.age += dt;

    // Trail 更新: 現在地を追加し、寿命を過ぎた点を捨てる。
    this.trail.push({ pos: { ...this.position }, age: 0 });
    for (const t of this.trail) t.age += dt;
    while (
      this.trail.length > 0 &&
      this.trail[0].age > ProjectileConfig.trailLifeSec
    ) {
      this.trail.shift();
    }
  }

  isDead(width: number, height: number): boolean {
    if (!this.alive) return true;
    if (this.age >= ProjectileConfig.maxLifeSec) return true;
    const m = ProjectileConfig.cullMargin;
    return (
      this.position.y > height + m ||
      this.position.x < -m ||
      this.position.x > width + m
    );
  }

  kill(): void {
    this.alive = false;
  }
}
