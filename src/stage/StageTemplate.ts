import type { Obstacle, Vec3 } from '../core/types';
import type { Target } from '../target/Target';
import type { SceneProp } from './Scene';

/** 描画ガイド (レーン線・穴マーカーなど) の線分。 */
export interface GuideSegment {
  a: Vec3;
  b: Vec3;
}

/**
 * StageTemplate
 * 責務: 1種類のステージ(出現/移動/連鎖などのルール)を表す。
 *       的の生成・更新・命中時の状況変化を内部に閉じ込め、
 *       GameEngine からは共通インターフェースで扱えるようにする (拡張性)。
 */
export interface StageTemplate {
  readonly displayName: string;
  /** 背景画像を使う場合のキー (未指定ならグラデーション背景)。 */
  readonly backgroundKey?: string;
  /** 的の移動・寿命・再出現を進める。 */
  update(dt: number): void;
  /** 現在当たり判定/描画対象となる的。 */
  getTargets(): Target[];
  /**
   * 命中時に呼ばれる。加点する得点を返す (0 = 加点なし)。
   * 連鎖やトリガーなどの「撃つと何かが起きる」処理もここで行う。
   */
  onHit(target: Target): number;
  /** 描画用の誘導ガイド線。 */
  getGuides(): GuideSegment[];
  /** 協力ギミック達成 (2人が短時間に両方トリガー) → 特大ボーナス解放 (任意)。 */
  onCoopTrigger?(): void;
  /** ステージの残り時間の通知 (任意)。フィナーレのボーナスタイム等に使う。 */
  onTimeLeft?(sec: number): void;
  /** 背景・建物などのシーン装飾 (任意)。 */
  getProps?(): SceneProp[];
  /** 弾を遮る障害物 (任意)。 */
  getObstacles?(): Obstacle[];
}
