import { WorldConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';
import type { WeaponSpec } from './WeaponSpec';

/** Trail を構成する点 (経過時間つき)。 */
export interface TrailPoint {
  pos: Vec3;
  age: number;
}

/**
 * Projectile
 * 責務: 3D空間を飛ぶ1個の投擲物。WeaponSpec (重力倍率・空気抵抗) に従って
 *       弾道が変わる。卵=山なり / ダーツ=直線 / 輪=ふわり。
 */
export class Projectile {
  readonly position: Vec3;
  private readonly velocity: Vec3;
  readonly radius: number;
  readonly trail: TrailPoint[] = [];
  private age = 0;
  private alive = true;
  /** 横方向の加速 (カーブ)。0=直進。 */
  private readonly curve: number;
  readonly playerId: number;
  readonly color: string;
  readonly spec: WeaponSpec;
  /** 描画用: 発射からの回転位相 (リングのスピンなど)。 */
  spin = 0;

  constructor(
    position: Vec3,
    velocity: Vec3,
    spec: WeaponSpec,
    curve = 0,
    playerId = 0,
    color?: string,
  ) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.spec = spec;
    this.radius = spec.radius;
    this.curve = curve;
    this.playerId = playerId;
    this.color = color ?? spec.color;
  }

  /** 現在の速度 (描画で向きを合わせる用)。 */
  getVelocity(): Vec3 {
    return this.velocity;
  }

  update(dt: number): void {
    // 重力 (武器ごとの倍率) で下向きに加速。
    this.velocity.y -= WorldConfig.gravity * this.spec.gravityScale * dt;
    // 空気抵抗: 速度に比例して減速 (輪のふわり感)。
    if (this.spec.drag > 0) {
      const k = Math.max(0, 1 - this.spec.drag * dt);
      this.velocity.x *= k;
      this.velocity.y *= k;
      this.velocity.z *= k;
    }
    // カーブ: 横方向に加速して弧を描く。
    this.velocity.x += this.curve * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    this.age += dt;
    this.spin += dt * 10;

    // Trail 更新: 現在地を追加し、寿命を過ぎた点を捨てる。
    this.trail.push({ pos: { ...this.position }, age: 0 });
    for (const t of this.trail) t.age += dt;
    while (
      this.trail.length > 0 &&
      this.trail[0].age > WorldConfig.trailLifeSec
    ) {
      this.trail.shift();
    }
  }

  isDead(): boolean {
    if (!this.alive) return true;
    if (this.age >= WorldConfig.maxLifeSec) return true;
    return (
      this.position.z > WorldConfig.maxZ ||
      this.position.y < WorldConfig.floorY - 0.5
    );
  }

  kill(): void {
    this.alive = false;
  }
}
