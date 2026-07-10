import { WorldConfig, type ProjectileKind } from '../config/GameConfig';
import type { Vec3 } from '../core/types';

/** Trail を構成する点 (経過時間つき)。 */
export interface TrailPoint {
  pos: Vec3;
  age: number;
}

/**
 * Projectile
 * 責務: 3D空間を飛ぶ1個の弾。重力を受けて放物線を描く。
 *       弾の種類(kind)・重力・半径はステージの武器で変わる。
 */
export class Projectile {
  readonly position: Vec3;
  private readonly velocity: Vec3;
  readonly radius: number;
  /** 弾の見た目の種類 (ステージの武器)。 */
  readonly kind: ProjectileKind;
  /** この弾に働く重力 (武器ごとに違う)。 */
  private readonly gravity: number;
  readonly trail: TrailPoint[] = [];
  private age = 0;
  private alive = true;
  /** 横方向の加速 (カーブ。ワールド単位/秒^2)。0=直進。 */
  private readonly curve: number;
  /** 撃ったプレイヤー。 */
  readonly playerId: number;
  /** 弾の色 (プレイヤー色)。 */
  readonly color: string;

  constructor(
    position: Vec3,
    velocity: Vec3,
    curve = 0,
    playerId = 0,
    color: string = WorldConfig.ballColor,
    kind: ProjectileKind = 'ball',
    gravity: number = WorldConfig.gravity,
    radius: number = WorldConfig.ballRadius,
  ) {
    this.position = { ...position };
    this.velocity = { ...velocity };
    this.curve = curve;
    this.playerId = playerId;
    this.color = color;
    this.kind = kind;
    this.gravity = gravity;
    this.radius = radius;
  }

  update(dt: number): void {
    // 重力で下向きに加速 (y は上が正)。
    this.velocity.y -= this.gravity * dt;
    // カーブ: 横方向に加速して弧を描く。
    this.velocity.x += this.curve * dt;
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
