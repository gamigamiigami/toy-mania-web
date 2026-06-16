import { CameraConfig, ProjectileConfig } from '../config/GameConfig';
import type { Vec2 } from '../core/types';
import type { Target } from '../target/Target';
import { Projectile } from './Projectile';

/** 命中イベント */
export interface ProjectileHit {
  target: Target;
  point: Vec2;
}

/**
 * ProjectileSystem
 * 責務: 弾の発射・移動・破棄、およびターゲットとの物理衝突判定。
 *       HitScan(Raycast即時) を廃止し、軌跡を持つ実体弾で当てる方式。
 */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  /** 弾の半径 = 画面高さ * radiusRatio (仕様書: 直径3%)。 */
  private readonly radius =
    ProjectileConfig.radiusRatio * CameraConfig.height;

  constructor(
    private readonly screenWidth: number,
    private readonly screenHeight: number,
  ) {}

  /** 画面下部の銃口位置 (発射元)。 */
  getMuzzle(): Vec2 {
    return {
      x: ProjectileConfig.muzzleX * this.screenWidth,
      y: ProjectileConfig.muzzleY * this.screenHeight,
    };
  }

  /**
   * 照準方向へ弾を1発発射する。
   * linear   : 照準点へ固定時間 travelTimeSec で直進 (重力0)。
   * parabola : 照準方向へ launchSpeed で射出し重力で落下。
   * @param aim 照準のスクリーン座標 (狙っている方向を示す点)
   */
  launch(aim: Vec2): void {
    const muzzle = this.getMuzzle();
    const dx = aim.x - muzzle.x;
    const dy = aim.y - muzzle.y;

    let velocity: Vec2;
    let gravity: number;

    if (ProjectileConfig.mode === 'parabola') {
      const len = Math.hypot(dx, dy) || 1;
      const speed = ProjectileConfig.launchSpeed;
      velocity = { x: (dx / len) * speed, y: (dy / len) * speed };
      gravity = ProjectileConfig.gravity;
    } else {
      // linear: 距離によらず travelTimeSec で照準点へ到達する等速直進。
      const t = ProjectileConfig.travelTimeSec;
      velocity = { x: dx / t, y: dy / t };
      gravity = 0;
    }

    this.projectiles.push(
      new Projectile(muzzle, velocity, gravity, this.radius),
    );
  }

  /**
   * 弾を進め、ターゲットとの衝突を判定する。
   * @returns このフレームで発生した命中の配列
   */
  update(dt: number, targets: readonly Target[]): ProjectileHit[] {
    const hits: ProjectileHit[] = [];

    for (const p of this.projectiles) {
      p.update(dt);
      for (const t of targets) {
        // 円と円の衝突。当たり判定はガバガバ倍率を掛ける。
        const reach =
          p.radius + t.radius * ProjectileConfig.hitboxMultiplier;
        const dist = Math.hypot(
          p.position.x - t.position.x,
          p.position.y - t.position.y,
        );
        if (dist <= reach && t.hit()) {
          hits.push({ target: t, point: { ...p.position } });
          p.kill();
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter(
      (p) => !p.isDead(this.screenWidth, this.screenHeight),
    );
    return hits;
  }

  getProjectiles(): readonly Projectile[] {
    return this.projectiles;
  }
}
