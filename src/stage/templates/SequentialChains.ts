import { TemplatesConfig } from '../../config/GameConfig';
import type { GameBus } from '../../core/EventBus';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';

/**
 * SequentialChains (Template5)
 * 責務: 番号付き5個を 1→2→3→4→5 の順に撃たせる連鎖。
 *       正しい順で全部撃つと Bonus が出現 (発見の報酬)。
 *       順番を間違えるとリセット。連鎖反応を検証する。
 *       5個は XYZ バラバラに配置 (平面禁止)。
 */
export class SequentialChains implements StageTemplate {
  readonly displayName = 'Sequential Chains';
  private chain: Target[] = [];
  private bonus: Target | null = null;
  private expectedNext = 1;

  constructor(private readonly bus: GameBus) {
    this.buildChain();
  }

  private buildChain(): void {
    this.chain = TemplatesConfig.chains.positions.map(
      (p, i) =>
        new Target({
          position: p,
          type: TargetType.Normal,
          label: String(i + 1),
        }),
    );
    this.expectedNext = 1;
    this.emitProgress();
  }

  private emitProgress(): void {
    this.bus.emit('status', {
      text: `Chain ${this.expectedNext - 1}/${this.chain.length}`,
    });
  }

  private spawnBonus(): void {
    this.bonus = new Target({
      position: TemplatesConfig.chains.bonusPos,
      type: TargetType.Bonus,
      life: TemplatesConfig.chains.bonusLifeSec,
    });
    this.bus.emit('bonusSpawned', {});
    this.bus.emit('status', { text: 'BONUS! 撃て' });
  }

  update(dt: number): void {
    for (const t of this.chain) t.update(dt);

    if (this.bonus) {
      this.bonus.update(dt);
      if (this.bonus.isIdle()) {
        this.bonus.life -= dt;
        if (this.bonus.life <= 0) this.bonus.expire();
      }
      if (this.bonus.isDestroyed()) {
        // ボーナス消化/時間切れ → 連鎖をリセットして再挑戦。
        this.bonus = null;
        this.buildChain();
      }
    }
  }

  getTargets(): Target[] {
    const out = this.chain.filter((t) => !t.isDestroyed());
    if (this.bonus && !this.bonus.isDestroyed()) out.push(this.bonus);
    return out;
  }

  onHit(target: Target): number {
    if (target.type === TargetType.Bonus) {
      // リセットは update(消滅検知)で行う。
      return target.scoreValue;
    }

    const num = Number(target.label);
    if (num === this.expectedNext) {
      // 正しい順番。
      this.expectedNext++;
      if (this.expectedNext > this.chain.length) {
        this.spawnBonus();
      } else {
        this.emitProgress();
      }
      return target.scoreValue;
    }

    // 順番ミス → リセット (加点なし)。
    this.buildChain();
    this.bus.emit('status', { text: 'MISS! 順番リセット' });
    return 0;
  }

  getGuides(): GuideSegment[] {
    return [];
  }
}
