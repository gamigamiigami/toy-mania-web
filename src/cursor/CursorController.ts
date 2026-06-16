import { CursorConfig } from '../config/GameConfig';
import { OneEuroFilter } from '../core/OneEuroFilter';
import { TrackingState, type PointerResult, type Vec2 } from '../core/types';

/**
 * CursorController
 * 責務: カーソル位置の平滑化 (One Euro Filter) と Tracking 状態の保持。
 *       静止時のブレを抑えつつ、素早い動きには追従する。描画は Renderer が参照する。
 */
export class CursorController {
  private position: Vec2 = { x: 0, y: 0 };
  private state: TrackingState = TrackingState.Lost;
  private initialized = false;
  private readonly fx = new OneEuroFilter(
    CursorConfig.filterMinCutoff,
    CursorConfig.filterBeta,
    CursorConfig.filterDCutoff,
  );
  private readonly fy = new OneEuroFilter(
    CursorConfig.filterMinCutoff,
    CursorConfig.filterBeta,
    CursorConfig.filterDCutoff,
  );

  constructor(
    private readonly screenWidth: number,
    private readonly screenHeight: number,
  ) {}

  /**
   * 入力を反映する。
   * @param pointer MediaPipeBridge の出力 (正規化座標)
   * @param dt 経過時間 (秒)
   */
  update(pointer: PointerResult, dt: number): void {
    this.state = pointer.state;
    if (pointer.state === TrackingState.Lost || !pointer.position) {
      // Lost 時は位置を保持する。
      return;
    }

    // 正規化座標を One Euro Filter で平滑化してからスクリーン座標へ。
    const nx = this.fx.filter(pointer.position.x, dt);
    const ny = this.fy.filter(pointer.position.y, dt);
    this.position = { x: nx * this.screenWidth, y: ny * this.screenHeight };
    this.initialized = true;
  }

  getPosition(): Vec2 {
    return this.position;
  }

  getState(): TrackingState {
    return this.state;
  }

  /** Tracking 中のみ true (発射可否の判断に使う)。 */
  isTracking(): boolean {
    return this.state === TrackingState.Tracking && this.initialized;
  }
}
