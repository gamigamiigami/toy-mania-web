import { ScoreValue } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';

/** 得点からターゲット種別(発光/見た目の強調)を決める。 */
export function tierType(score: number): TargetType {
  if (score >= ScoreValue.high) return TargetType.Bonus;
  if (score >= ScoreValue.mid) return TargetType.HighValue;
  return TargetType.Normal;
}

/** min..max の一様乱数。 */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** 線形補間 (0..1 でクランプ)。 */
export function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, p));
}

/**
 * StageEventQueue
 * 責務: テンプレート内で起きた出来事を溜め、GameEngine が1フレーム1回取り出す。
 */
export class StageEventQueue {
  private events: StageEventKind[] = [];

  push(kind: StageEventKind): void {
    this.events.push(kind);
  }

  consume(): StageEventKind[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}

/**
 * RespawnQueue
 * 責務: 「n秒後に1体再出現」の予約を管理する共通処理。
 */
export class RespawnQueue {
  private pending: number[] = [];

  /** delay 秒後の再出現を予約する。 */
  schedule(delay: number): void {
    this.pending.push(delay);
  }

  /** 時間を進め、期限が来た分 spawn() を呼ぶ。 */
  update(dt: number, spawn: () => void): void {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i] -= dt;
      if (this.pending[i] <= 0) {
        this.pending.splice(i, 1);
        spawn();
      }
    }
  }
}
