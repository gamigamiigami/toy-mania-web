import type { Vec2 } from '../core/types';
import type { Target } from '../target/Target';

/** HitScan の結果 */
export interface HitResult {
  hit: boolean;
  /** 命中したターゲット (Miss の場合 null) */
  target: Target | null;
  /** 着弾点 (照準位置) */
  point: Vec2;
}

/**
 * HitScanWeapon
 * 責務: 照準位置から即時 (Raycast 相当) に命中判定を行う。
 *       物理弾・放物線は持たない。
 */
export class HitScanWeapon {
  /**
   * @param aim 照準のスクリーン座標
   * @param targets 判定対象
   */
  fire(aim: Vec2, targets: readonly Target[]): HitResult {
    for (const target of targets) {
      if (target.contains(aim)) {
        return { hit: true, target, point: { ...aim } };
      }
    }
    return { hit: false, target: null, point: { ...aim } };
  }
}
