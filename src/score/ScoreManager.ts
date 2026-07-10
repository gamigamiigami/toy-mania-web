/**
 * ScoreManager
 * 責務: 合計スコアの保持・加算。
 * 本家準拠: 倍率などの補正はなく、的の得点がそのまま加算される。
 */
export class ScoreManager {
  private score = 0;

  /** 命中時に得点を加算する。加算した値を返す。 */
  add(value: number): number {
    if (value <= 0) return 0;
    this.score += value;
    return value;
  }

  getScore(): number {
    return this.score;
  }

  reset(): void {
    this.score = 0;
  }
}
