import { TargetConfig } from '../config/GameConfig';
import { TargetState, TargetType, type Vec3 } from '../core/types';

export interface TargetOptions {
  position: Vec3;
  type?: TargetType;
  radius?: number;
  scoreValue?: number;
  /** 連鎖テンプレートの番号など、表示用ラベル。 */
  label?: string | null;
  /** 出現からの生存時間 (秒)。Infinity で永続。 */
  life?: number;
  /** 的スプライトシートのアイコン番号 (0..8)。未指定なら円で描画。 */
  iconIndex?: number | null;
}

/**
 * Target
 * 責務: 1つのターゲットの状態 (Idle/Hit/Destroyed)、分類、得点、被弾処理。
 *       3Dワールド座標に存在する。移動/寿命の進行はテンプレート側が駆動する
 *       (vx, life を更新する) ため、Target 自身は被弾フラッシュのみ管理する。
 */
export class Target {
  readonly position: Vec3;
  readonly type: TargetType;
  readonly radius: number;
  readonly scoreValue: number;
  readonly label: string | null;
  /** 的スプライトのアイコン番号 (未指定=null)。 */
  readonly iconIndex: number | null;
  /** 横移動速度 (スライダー用、ワールド単位/秒)。 */
  vx = 0;
  /** 残り生存時間 (ポップアップ/ボーナス用)。 */
  life: number;
  state: TargetState = TargetState.Idle;
  private flash = 0;

  constructor(opts: TargetOptions) {
    this.position = { ...opts.position };
    this.type = opts.type ?? TargetType.Normal;
    this.radius = opts.radius ?? TargetConfig.radius;
    this.scoreValue = opts.scoreValue ?? TargetConfig.scores[this.type];
    this.label = opts.label ?? null;
    this.iconIndex = opts.iconIndex ?? null;
    this.life = opts.life ?? Infinity;
  }

  /** 被弾。Idle のときだけ命中する。 */
  hit(): boolean {
    if (this.state !== TargetState.Idle) return false;
    this.state = TargetState.Hit;
    this.flash = 0;
    return true;
  }

  /** 被弾フラッシュの進行。寿命切れの判定はテンプレートが行う。 */
  update(dt: number): void {
    if (this.state === TargetState.Hit) {
      this.flash += dt;
      if (this.flash >= TargetConfig.hitFlashSec) {
        this.state = TargetState.Destroyed;
      }
    }
  }

  /** 寿命切れで消す (ポップアップ消滅など)。 */
  expire(): void {
    this.state = TargetState.Destroyed;
  }

  isIdle(): boolean {
    return this.state === TargetState.Idle;
  }

  isDestroyed(): boolean {
    return this.state === TargetState.Destroyed;
  }
}
