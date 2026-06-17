import { ScoreTier } from '../../config/GameConfig';
import { TargetType } from '../../core/types';

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
