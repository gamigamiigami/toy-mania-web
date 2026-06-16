import { WorldConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';

/** Trail を構成する点 (経過時間つき)。 */
export interface TrailPoint {
  pos: Vec3;
  age: number;
}

/**
 * Projectile
 * 責務: 3D空間を飛ぶ1個のボール。重力を受けて放物線を描く。
 *       奥(+z)へ進むほど飛行時間が伸び、落下量が増える。
 */
export class Projectile {
  readonly position: Vec3;
  private readonly velocity: Vec3;
  readonly radius = WorldConfig.ballRadius;
  readonly trail: TrailPoint[] = [];
  private age = 0;
  private alive = true;

  constructor(position: Vec3, velocity: Vec3) {
    this.position = { ...position };
    this.velocity = { ...velocity };
  }

  update(dt: number): void {
    // 重力で下向きに加速 (y は上が正)。
    this.velocity.y -= WorldConfig.gravity * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    this.age += dt;

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
      this.position.y < WorldConfig.floorY
    );
  }

  kill(): void {
    this.alive = false;
  }
}
