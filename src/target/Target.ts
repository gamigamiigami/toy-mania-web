import { TargetConfig } from '../config/GameConfig';
import { TargetState, type Vec2 } from '../core/types';

/**
 * Target
 * 責務: 1つのターゲットの状態 (Spawn/Idle/Hit/Destroyed) と被弾処理。
 */
export class Target {
  position: Vec2;
  readonly radius = TargetConfig.radius;
  state: TargetState = TargetState.Spawn;
  private timer = 0;

  constructor(position: Vec2) {
    this.position = position;
    this.state = TargetState.Idle;
  }

  /** 当たり判定: 点が半径内にあるか。 */
  contains(point: Vec2): boolean {
    if (this.state !== TargetState.Idle) return false;
    return Math.hypot(point.x - this.position.x, point.y - this.position.y) <=
      this.radius;
  }

  /** 被弾処理。Idle のときだけ命中する。 */
  hit(): boolean {
    if (this.state !== TargetState.Idle) return false;
    this.state = TargetState.Hit;
    this.timer = 0;
    return true;
  }

  /** Hit フラッシュ後に Destroyed へ遷移する。 */
  update(dt: number): void {
    if (this.state === TargetState.Hit) {
      this.timer += dt;
      if (this.timer >= TargetConfig.hitFlashSec) {
        this.state = TargetState.Destroyed;
      }
    }
  }

  isDestroyed(): boolean {
    return this.state === TargetState.Destroyed;
  }
}
