import { ScoreTier, TargetConfig, type TriggerSpec } from '../../config/GameConfig';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';

/** 得点からターゲット種別(発光/見た目)を決める。 */
export function tierType(score: number): TargetType {
  if (score >= ScoreTier.top) return TargetType.Bonus;
  if (score >= ScoreTier.high) return TargetType.HighValue;
  return TargetType.Normal;
}

/** トイ画像(3x3=9種)からランダムなアイコン。 */
export function randIcon(): number {
  return Math.floor(Math.random() * 9);
}

/**
 * FixedTrigger
 * 責務: 場所固定の隠しトリガー的 (本家の「キツネを撃つと鶏小屋が開く」方式)。
 *       撃たれると respawn 秒後に同じ場所へ再出現する。
 */
export class FixedTrigger {
  private target: Target | null = null;
  private timer = 0;

  constructor(private readonly spec: TriggerSpec) {
    this.spawnNow();
  }

  private spawnNow(): void {
    this.target = new Target({
      position: { x: this.spec.x, y: this.spec.y, z: this.spec.z },
      radius: this.spec.tr,
      type: TargetType.Trigger,
      scoreValue: TargetConfig.scores[TargetType.Trigger],
      iconIndex: randIcon(),
    });
  }

  update(dt: number): void {
    if (this.target) {
      this.target.update(dt);
      if (this.target.isDestroyed()) {
        this.target = null;
        this.timer = this.spec.respawn;
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0) this.spawnNow();
    }
  }

  targets(): Target[] {
    return this.target && !this.target.isDestroyed() ? [this.target] : [];
  }
}
