import { StagesConfig } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import { randIcon } from './util';

const B = StagesConfig.burst;

/**
 * BonusBurst
 * 責務: トリガー的を撃った時に高得点ボーナスを一斉に噴き出す共通ギミック。
 *       各ステージが合成して使う。寿命で自動消滅。
 */
export class BonusBurst {
  private bonus: Target[] = [];

  /** ボーナスを噴き出す (撃った的の近くを中心に散らす)。 */
  spawn(centerX = 0, centerZ: number = B.z): void {
    for (let i = 0; i < B.count; i++) {
      this.bonus.push(
        new Target({
          position: {
            x: centerX + (Math.random() * 2 - 1) * B.spreadX,
            y: B.yMin + Math.random() * (B.yMax - B.yMin),
            z: centerZ + (Math.random() * 2 - 1) * B.zSpread,
          },
          radius: B.tr,
          scoreValue: B.score,
          type: TargetType.Bonus,
          life: B.life,
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
