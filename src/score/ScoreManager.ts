import { ScoreConfig } from '../config/GameConfig';

/**
 * ScoreManager
 * 責務: 合計スコアの保持・加算と、連続命中(コンボ)の計測。
 *       本家準拠のためコンボは「表示のみ」で加点倍率は掛けない。
 */
export class ScoreManager {
  private score = 0;
  private combo = 0;
  private sinceLastHit = 0;
  /** 命中数 (命中率の集計用)。 */
  private hits = 0;

  /**
   * 命中時に得点を加算する。加点した値をそのまま返す (倍率なし)。
   * 0点はコンボを途切れさせる。
   */
  add(value: number): number {
    if (value <= 0) {
      this.combo = 0;
      return 0;
    }
    this.combo += 1;
    this.hits += 1;
    this.sinceLastHit = 0;
    this.score += value;
    return value;
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

  getHits(): number {
    return this.hits;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.sinceLastHit = 0;
    this.hits = 0;
  }
}
