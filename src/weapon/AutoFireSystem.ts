/**
 * AutoFireSystem
 * 責務: 一定間隔で発射イベントを発火する (カメラ操作時の自動連射)。
 *       間隔はステージの武器 (WeaponSpec.fireIntervalSec) に従う。
 */
export class AutoFireSystem {
  private elapsed = 0;

  constructor(
    private readonly onFire: () => void,
    /** 現在の発射間隔 (秒) を返す。ステージ切替で変わるため関数で渡す。 */
    private readonly getInterval: () => number,
  ) {}

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

    const interval = this.getInterval();
    this.elapsed += dt;
    while (this.elapsed >= interval) {
      this.elapsed -= interval;
      this.onFire();
    }
  }
}
