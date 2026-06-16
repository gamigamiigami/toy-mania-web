import { TargetConfig } from '../config/GameConfig';
import type { Vec2 } from '../core/types';
import { Target } from './Target';

/**
 * TargetManager
 * 責務: ターゲットの生成・破棄・再出現を管理する (MVPは常に1個)。
 */
export class TargetManager {
  private targets: Target[] = [];
  private respawnTimer = 0;

  constructor(
    private readonly screenWidth: number,
    private readonly screenHeight: number,
  ) {
    this.spawn();
  }

  private randomPosition(): Vec2 {
    const m = TargetConfig.spawnMargin;
    return {
      x: m + Math.random() * (this.screenWidth - m * 2),
      y: m + Math.random() * (this.screenHeight - m * 2),
    };
  }

  private spawn(): void {
    this.targets.push(new Target(this.randomPosition()));
  }

  update(dt: number): void {
    for (const t of this.targets) t.update(dt);

    const before = this.targets.length;
    this.targets = this.targets.filter((t) => !t.isDestroyed());

    // 破棄が発生したら遅延後に再出現させる。
    if (this.targets.length < before) {
      this.respawnTimer = TargetConfig.respawnDelaySec;
    }

    if (this.targets.length < TargetConfig.maxCount) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.spawn();
      }
    }
  }

  getTargets(): readonly Target[] {
    return this.targets;
  }
}
