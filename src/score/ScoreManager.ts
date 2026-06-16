import { ScoreConfig } from '../config/GameConfig';

/**
 * ScoreManager
 * 責務: 合計スコアの保持・加算と、連続命中(コンボ)の計測。
 */
export class ScoreManager {
  private score = 0;
  private combo = 0;
  private sinceLastHit = 0;

  /** 任意得点を加算する。0点(順番ミス等)はコンボを途切れさせる。 */
  add(value: number): void {
    if (value > 0) {
      this.score += value;
      this.combo += 1;
      this.sinceLastHit = 0;
    } else {
      this.combo = 0;
    }
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
