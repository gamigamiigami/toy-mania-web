import { WorldConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';
import type { Target } from '../target/Target';
import { Projectile } from './Projectile';

/** 命中イベント (命中点は3Dワールド座標)。 */
export interface ProjectileHit {
  target: Target;
  point: Vec3;
}

/**
 * ProjectileSystem
 * 責務: 3Dボールの発射・移動・破棄、およびターゲットとの球同士の衝突判定。
 */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];

  /**
   * 照準レイ方向へボールを1発投げる。
   * @param rayDir カメラから奥へ伸びる単位方向ベクトル (Camera.screenToRay)
   */
  launch(rayDir: Vec3): void {
    const v = WorldConfig.throwSpeed;
    const velocity: Vec3 = {
      x: rayDir.x * v,
      y: rayDir.y * v,
      z: rayDir.z * v,
    };
    this.projectiles.push(new Projectile({ ...WorldConfig.muzzle }, velocity));
  }

  /**
   * ボールを進め、ターゲットとの衝突 (球vs球) を判定する。
   * @returns このフレームで発生した命中の配列
   */
  update(dt: number, targets: readonly Target[]): ProjectileHit[] {
    const hits: ProjectileHit[] = [];

    for (const p of this.projectiles) {
      p.update(dt);
      for (const t of targets) {
        const reach = p.radius + t.radius * WorldConfig.hitboxMultiplier;
        const dx = p.position.x - t.position.x;
        const dy = p.position.y - t.position.y;
        const dz = p.position.z - t.position.z;
        if (dx * dx + dy * dy + dz * dz <= reach * reach && t.hit()) {
          hits.push({ target: t, point: { ...p.position } });
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

  /** 全弾を消す (テンプレート切替時など)。 */
  clear(): void {
    this.projectiles = [];
  }
}
