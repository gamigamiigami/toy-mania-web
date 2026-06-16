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
