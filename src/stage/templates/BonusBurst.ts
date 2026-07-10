import { StagesConfig } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import { randIcon } from './util';

const B = StagesConfig.burst;
const M = StagesConfig.burstMega;

/**
 * BonusBurst
 * 責務: トリガー的を撃った時に高得点ボーナスを一斉に噴き出す共通ギミック。
 *       各ステージが合成して使う。寿命で自動消滅。
 */
export class BonusBurst {
  private bonus: Target[] = [];

  /** ボーナスを噴き出す (撃った的の近くを中心に散らす)。 */
  spawn(centerX = 0, centerZ: number = B.z): void {
    this.burst(B, centerX, centerZ);
  }

  /** 協力ギミック達成時の特大ボーナス (数も点も多い)。 */
  spawnMega(): void {
    this.burst(M, 0, M.z);
  }

  private burst(cfg: typeof B | typeof M, centerX: number, centerZ: number): void {
    for (let i = 0; i < cfg.count; i++) {
      this.bonus.push(
        new Target({
          position: {
            x: centerX + (Math.random() * 2 - 1) * cfg.spreadX,
            y: cfg.yMin + Math.random() * (cfg.yMax - cfg.yMin),
            z: centerZ + (Math.random() * 2 - 1) * cfg.zSpread,
          },
          radius: cfg.tr,
          scoreValue: cfg.score,
          type: TargetType.Bonus,
          life: cfg.life,
          iconIndex: randIcon(),
        }),
      );
    }
  }

  update(dt: number): void {
    for (const b of this.bonus) {
      b.update(dt);
      if (b.isIdle()) {
        b.life -= dt;
        if (b.life <= 0) b.expire();
      }
    }
    this.bonus = this.bonus.filter((b) => !b.isDestroyed());
  }

  targets(): Target[] {
    return this.bonus.filter((b) => !b.isDestroyed());
  }
}
