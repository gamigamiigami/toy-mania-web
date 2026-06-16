import { ScoreConfig } from '../config/GameConfig';

/**
 * ScoreManager
 * 責務: 総スコアの保持と加算。
 */
export class ScoreManager {
  private score = 0;

  addHit(): void {
    this.score += ScoreConfig.perHit;
  }

  getScore(): number {
    return this.score;
  }

  reset(): void {
    this.score = 0;
  }
}
