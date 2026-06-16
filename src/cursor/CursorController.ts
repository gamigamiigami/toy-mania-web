import { CursorConfig } from '../config/GameConfig';
import { TrackingState, type PointerResult, type Vec2 } from '../core/types';

/**
 * CursorController
 * 責務: カーソル位置の平滑化 (SmoothDamp 相当) と DeadZone 処理、
 *       および Tracking 状態の保持。描画は Renderer 側が参照する。
 */
export class CursorController {
  /** スクリーン座標 (px) */
  private position: Vec2 = { x: 0, y: 0 };
  private velocity: Vec2 = { x: 0, y: 0 };
  private state: TrackingState = TrackingState.Lost;
  private initialized = false;

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
      // Lost 時は位置を保持 (急な飛びを防ぐ)。
      return;
    }

    const target: Vec2 = {
      x: pointer.position.x * this.screenWidth,
      y: pointer.position.y * this.screenHeight,
    };

    // 初回はワープさせる
    if (!this.initialized) {
      this.position = { ...target };
      this.velocity = { x: 0, y: 0 };
      this.initialized = true;
      return;
    }

    // DeadZone: 微小移動は無視
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    if (Math.hypot(dx, dy) < CursorConfig.deadZoneRadius) {
      return;
    }

    this.position.x = this.smoothDamp(
      this.position.x,
      target.x,
      'x',
      dt,
    );
    this.position.y = this.smoothDamp(
      this.position.y,
      target.y,
      'y',
      dt,
    );
  }

  /** Unity SmoothDamp 相当の臨界減衰補間。 */
  private smoothDamp(
    current: number,
    target: number,
    axis: 'x' | 'y',
    dt: number,
  ): number {
    const smoothTime = Math.max(0.0001, CursorConfig.smoothTime);
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = current - target;
    const temp = (this.velocity[axis] + omega * change) * dt;
    this.velocity[axis] = (this.velocity[axis] - omega * temp) * exp;
    return target + (change + temp) * exp;
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
