import { StreakerConfig } from '../config/GameConfig';
import { TargetType } from '../core/types';
import { Target } from '../target/Target';

const S = StreakerConfig;

/**
 * StreakerSystem
 * 責務: たまに画面を高速で横切る特大ボーナス的 (5000点)。
 *       どのステージでも出現する (GameEngine が所有し、テンプレートとは独立)。
 */
export class StreakerSystem {
  private target: Target | null = null;
  private timer = this.nextInterval();

  private nextInterval(): number {
    return S.intervalMin + Math.random() * (S.intervalMax - S.intervalMin);
  }

  private spawnNow(): void {
    const fromLeft = Math.random() < 0.5;
    const t = new Target({
      position: { x: fromLeft ? -S.xEdge : S.xEdge, y: S.y, z: S.z },
      radius: S.tr,
      scoreValue: S.score,
      type: TargetType.Bonus,
      iconIndex: Math.floor(Math.random() * 9),
    });
    t.vx = fromLeft ? S.speed : -S.speed;
    this.target = t;
  }

  update(dt: number): void {
    if (this.target) {
      this.target.update(dt);
      this.target.position.x += this.target.vx * dt;
      if (Math.abs(this.target.position.x) > S.xEdge && !this.target.isDestroyed()) {
        // 撃たれずに通過 → 退場。
        this.target.expire();
      }
      if (this.target.isDestroyed()) {
        this.target = null;
        this.timer = this.nextInterval();
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) this.spawnNow();
    }
  }

  targets(): Target[] {
    return this.target && !this.target.isDestroyed() ? [this.target] : [];
  }

  owns(t: Target): boolean {
    return t === this.target;
  }

  /** ステージ切替時などにリセット (出現中の的は消す)。 */
  reset(): void {
    this.target = null;
    this.timer = this.nextInterval();
  }
}
