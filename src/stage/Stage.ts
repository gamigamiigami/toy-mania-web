import { StageConfig } from '../config/GameConfig';
import type { Vec3 } from '../core/types';

/** 1段ぶんの幾何 (上面と前面を描けるだけの情報)。 */
export interface Step {
  index: number;
  y: number;
  zNear: number;
  zFar: number;
  yBottom: number;
}

/**
 * Stage
 * 責務: ステージ形状(階段 or 射撃練習場)を定義し、
 *       的を置く固定スポーン座標と、描画用の段の幾何を提供する。
 */
export class Stage {
  readonly halfWidth = StageConfig.halfWidth;
  private readonly steps: Step[] = [];
  private readonly spawnPoints: Vec3[] = [];

  constructor() {
    if (StageConfig.mode === 'stairs') {
      this.buildStairs();
    } else {
      this.buildRange();
    }
  }

  /** 射撃練習場: 距離違い・同じ高さの静止的を一列に。 */
  private buildRange(): void {
    const { rangeDistances, rangeXs, rangeHeight } = StageConfig;
    rangeDistances.forEach((z, i) => {
      this.spawnPoints.push({ x: rangeXs[i] ?? 0, y: rangeHeight, z });
    });
  }

  /** 階段: 各段の上面中央に1個ずつ的を載せる。 */
  private buildStairs(): void {
    for (let i = 0; i < StageConfig.stepCount; i++) {
      const zNear = StageConfig.z0 + i * StageConfig.stepDepth;
      const y = StageConfig.y0 + i * StageConfig.stepRise;
      const zFar = zNear + StageConfig.stepDepth;
      this.steps.push({
        index: i,
        y,
        zNear,
        zFar,
        yBottom: y - StageConfig.stepRise,
      });
      // 段の中央に的を載せる (半径ぶん持ち上げる)。
      this.spawnPoints.push({
        x: 0,
        y: y + 0.7,
        z: (zNear + zFar) / 2,
      });
    }
  }

  getSteps(): readonly Step[] {
    return this.steps;
  }

  /** 的を置く固定座標 (スロット)。各スロットは命中後も同じ位置に再出現する。 */
  getSpawnPoints(): readonly Vec3[] {
    return this.spawnPoints;
  }
}
