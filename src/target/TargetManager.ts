import { TargetConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';
import { Target } from './Target';

/**
 * TargetManager
 * 責務: ターゲットの生成・破棄・再出現を管理する (最小3Dコアは常に1個)。
 *       3D ワールド空間の指定範囲にランダム配置する。
 */
export class TargetManager {
  private targets: Target[] = [];
  private respawnTimer = 0;

  constructor() {
    this.spawn();
  }

  private randomPosition(): Vec3 {
    return {
      x: (Math.random() * 2 - 1) * TargetConfig.xRange,
      y: TargetConfig.yMin + Math.random() * (TargetConfig.yMax - TargetConfig.yMin),
      z: TargetConfig.zMin + Math.random() * (TargetConfig.zMax - TargetConfig.zMin),
    };
  }

  private spawn(): void {
    this.targets.push(new Target(this.randomPosition()));
  }

  update(dt: number): void {
    for (const t of this.targets) t.update(dt);

    const before = this.targets.length;
    this.targets = this.targets.filter((t) => !t.isDestroyed());

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
