import { WorldConfig } from '../config/GameConfig';
import type { Obstacle, Vec3 } from '../core/types';
import type { Target } from '../target/Target';
import { Projectile } from './Projectile';
import type { WeaponSpec } from './WeaponSpec';

/** 命中イベント (命中点は3Dワールド座標)。 */
export interface ProjectileHit {
  target: Target;
  point: Vec3;
  /** 当てたプレイヤー。 */
  playerId: number;
}

/**
 * ProjectileSystem
 * 責務: 投擲物の発射・移動・破棄、およびターゲットとの球同士の衝突判定。
 *       弾道は WeaponSpec (ステージ別武器) に従う。
 */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];

  /**
   * 照準レイ方向へ現在の武器で1発投げる。
   * @param rayDir カメラから奥へ伸びる単位方向ベクトル (Camera.screenToRay)
   */
  launch(
    rayDir: Vec3,
    spec: WeaponSpec,
    curveRatio = 0,
    playerId = 0,
    color?: string,
  ): void {
    const v = spec.speed;
    const velocity: Vec3 = {
      x: rayDir.x * v,
      y: rayDir.y * v,
      z: rayDir.z * v,
    };
    const curve = curveRatio * WorldConfig.curveAccel;
    this.projectiles.push(
      new Projectile(
        { ...WorldConfig.muzzle },
        velocity,
        spec,
        curve,
        playerId,
        color,
      ),
    );
  }

  /**
   * 弾を進め、ターゲットとの衝突 (球vs球) を判定する。
   * @returns このフレームで発生した命中の配列
   */
  update(
    dt: number,
    targets: readonly Target[],
    obstacles: readonly Obstacle[] = [],
  ): ProjectileHit[] {
    const hits: ProjectileHit[] = [];

    for (const p of this.projectiles) {
      p.update(dt);
      // 障害物に当たったら消滅 (得点なし)。
      for (const o of obstacles) {
        const ox = p.position.x - o.x;
        const oy = p.position.y - o.y;
        const oz = p.position.z - o.z;
        const rr = o.radius + p.radius;
        if (ox * ox + oy * oy + oz * oz <= rr * rr) {
          p.kill();
          break;
        }
      }
      for (const t of targets) {
        const reach = p.radius + t.radius * WorldConfig.hitboxMultiplier;
        const dx = p.position.x - t.position.x;
        const dy = p.position.y - t.position.y;
        const dz = p.position.z - t.position.z;
        if (dx * dx + dy * dy + dz * dz <= reach * reach && t.hit()) {
          hits.push({ target: t, point: { ...p.position }, playerId: p.playerId });
          p.kill();
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => !p.isDead());
    return hits;
  }

  getProjectiles(): readonly Projectile[] {
    return this.projectiles;
  }

  /** 全弾を消す (ステージ切替時など)。 */
  clear(): void {
    this.projectiles = [];
  }
}
