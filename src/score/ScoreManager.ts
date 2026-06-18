import { ScoreConfig } from '../config/GameConfig';

/**
 * ScoreManager
 * 責務: 合計スコアの保持・加算と、連続命中(コンボ)の計測・倍率適用。
 */
export class ScoreManager {
  private score = 0;
  private combo = 0;
  private sinceLastHit = 0;

  /** 現在のコンボ倍率。 */
  multiplier(): number {
    const steps = Math.floor(this.combo / ScoreConfig.comboStep);
    return Math.min(ScoreConfig.comboMax, 1 + steps * ScoreConfig.comboBonus);
  }

  /**
   * 命中時に基礎点を加算する。コンボ倍率を掛けた実際の加点を返す。
   * 0点(順番ミス等)はコンボを途切れさせる。
   */
  add(value: number): number {
    if (value <= 0) {
      this.combo = 0;
      return 0;
    }
    this.combo += 1;
    this.sinceLastHit = 0;
    const awarded = Math.round(value * this.multiplier());
    this.score += awarded;
    return awarded;
  }

  /** コンボの時間切れを進める。 */
  update(dt: number): void {
    if (this.combo > 0) {
      this.sinceLastHit += dt;
      if (this.sinceLastHit > ScoreConfig.comboWindowSec) this.combo = 0;
    }
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.sinceLastHit = 0;
  }
}
