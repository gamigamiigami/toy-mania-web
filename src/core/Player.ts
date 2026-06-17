import { CursorController } from '../cursor/CursorController';
import { ScoreManager } from '../score/ScoreManager';
import type { Vec2 } from './types';

/**
 * Player
 * 責務: 1プレイヤーの照準カーソル・スコア・色・接続状態を保持する。
 */
export class Player {
  readonly cursor: CursorController;
  readonly score = new ScoreManager();
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

  reset(): void {
    this.score.reset();
  }
}
