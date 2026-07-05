import { CursorController } from '../cursor/CursorController';
import { ScoreManager } from '../score/ScoreManager';
import type { Vec2 } from './types';

/**
 * Player
 * 責務: 1プレイヤーの照準カーソル・スコア・発射数・色・接続状態を保持する。
 */
export class Player {
  readonly cursor: CursorController;
  readonly score = new ScoreManager();
  /** 発射数 (命中率 = hits / shots の集計用)。 */
  shots = 0;
  /** remote(スマホ)入力時の最新照準。 */
  remoteAim: Vec2 | null = null;
  connected = false;

  constructor(
    readonly id: number,
    readonly color: string,
    readonly name: string,
    width: number,
    height: number,
  ) {
    this.cursor = new CursorController(width, height);
  }

  /** 命中率 (0..1)。未発射なら 0。 */
  accuracy(): number {
    return this.shots > 0 ? this.score.getHits() / this.shots : 0;
  }

  reset(): void {
    this.score.reset();
    this.shots = 0;
  }
}
