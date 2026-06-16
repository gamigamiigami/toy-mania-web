import { WeaponConfig } from '../config/GameConfig';

/**
 * AutoFireSystem
 * 責務: 一定間隔 (0.5秒 = 2発/秒) で発射イベントを発火する。
 *       プレイヤーの発射操作は存在しない (自動連射)。
 */
export class AutoFireSystem {
  private elapsed = 0;

  constructor(private readonly onFire: () => void) {}

  /**
   * @param dt 経過時間 (秒)
   * @param enabled Tracking 中など発射が許可される場合 true
   */
  update(dt: number, enabled: boolean): void {
    if (!enabled) {
      // Lost 中は発射停止。タイマーはリセットして再開時に即撃ち過ぎないようにする。
      this.elapsed = 0;
      return;
    }

    this.elapsed += dt;
    while (this.elapsed >= WeaponConfig.fireIntervalSec) {
      this.elapsed -= WeaponConfig.fireIntervalSec;
      this.onFire();
    }
  }
}
