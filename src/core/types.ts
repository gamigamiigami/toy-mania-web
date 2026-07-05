/**
 * core/types
 * 責務: モジュール間で共有する型定義。
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** 3D ワールド座標。x:右+ / y:上+ / z:奥+ (カメラから画面の奥へ)。 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** トラッキング状態 */
export enum TrackingState {
  Tracking = 'Tracking',
  Lost = 'Lost',
}

/** MediaPipeBridge の出力 */
export interface PointerResult {
  state: TrackingState;
  /** 正規化座標 (0..1)。Lost の場合は null。 */
  position: Vec2 | null;
}

/** ターゲットのライフサイクル状態 */
export enum TargetState {
  Spawn = 'Spawn',
  Idle = 'Idle',
  Hit = 'Hit',
  Destroyed = 'Destroyed',
}

/**
 * ターゲット分類。
 *  Normal    : 基本ターゲット
 *  HighValue : 高得点 (視線誘導の最優先)
 *  Trigger   : 撃つと状況が変化する (高得点ではない)
 *  Bonus     : 条件達成後に出現する発見の報酬
 */
export enum TargetType {
  Normal = 'Normal',
  HighValue = 'HighValue',
  Trigger = 'Trigger',
  Bonus = 'Bonus',
}

/**
 * ステージ(シーン)種別。本家アトラクションの7シーン構成:
 * 練習(パイ) → 卵投げ牧場 → 風船火山ダーツ → 皿割りキャンプ
 * → リングトス宇宙港 → 吸盤ダーツ射的場 → ボーナスラウンド
 */
export type TemplateName =
  | 'practice'
  | 'eggfarm'
  | 'balloon'
  | 'plates'
  | 'rings'
  | 'gallery'
  | 'bonus';

/**
 * ターゲットの見た目 (ThreeRenderer がメッシュを選ぶ)。
 * カーニバルの「木の板の的」らしさを保ちつつシーンごとにテーマを変える。
 */
export type TargetStyle =
  | 'bullseye' // 同心円の的 (練習・汎用)
  | 'pig' // ブタの板的
  | 'sheep' // ヒツジの板的
  | 'weasel' // 柵から出没するイタチ
  | 'bird' // 空を飛ぶトリ
  | 'fox' // 屋根のキツネ (トリガー)
  | 'chicken' // 小屋から出るニワトリ (ボーナス)
  | 'balloon' // 風船
  | 'lava' // 溶岩風船 (トリガー)
  | 'plate' // 皿
  | 'stack' // 皿の山 (ボーナス)
  | 'alien' // 周回するエイリアン風
  | 'core' // ロボットの胸コア (トリガー)
  | 'wood' // 木の板的 (西部)
  | 'star' // 星の的 (トリガー)
  | 'bat' // コウモリ (ボーナス)
  | 'cart' // トロッコ
  | 'grow'; // 成長ターゲット

/** 撃った結果ステージ側で起きた出来事 (演出・効果音用)。 */
export type StageEventKind =
  | 'door' // 小屋の扉が開いた
  | 'eruption' // 火山噴火
  | 'stack' // 皿の山出現
  | 'rocket' // ロケット発射
  | 'bats' // コウモリ群飛来
  | 'growFinish'; // 成長ターゲットのフィニッシュ

/** 弾を遮る障害物 (球)。 */
export interface Obstacle {
  x: number;
  y: number;
  z: number;
  radius: number;
}
