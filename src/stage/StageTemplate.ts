import type {
  Obstacle,
  StageEventKind,
  TemplateName,
} from '../core/types';
import type { Target } from '../target/Target';
import type { WeaponSpec } from '../weapon/WeaponSpec';

/**
 * シーン演出の動的状態 (0..1 や角度など)。
 * ThreeRenderer のシーンビルダーが毎フレーム参照して装飾を動かす。
 *  例: { doorOpen: 0..1, windmill: 角度, eruption: 0..1, rocketLift: 0.. }
 */
export type SceneState = Record<string, number>;

/**
 * StageTemplate
 * 責務: 1シーン(出現/移動/連鎖などのルールと武器)を表す。
 *       的の生成・更新・命中時の状況変化を内部に閉じ込め、
 *       GameEngine からは共通インターフェースで扱えるようにする (拡張性)。
 */
export interface StageTemplate {
  readonly displayName: string;
  /** シーン装飾の種類 (ThreeRenderer が背景・建物を組み立てるキー)。 */
  readonly sceneId: TemplateName;
  /** このシーンの武器。 */
  readonly weapon: WeaponSpec;
  /** 的の移動・寿命・再出現を進める。 */
  update(dt: number): void;
  /** 現在当たり判定/描画対象となる的。 */
  getTargets(): Target[];
  /**
   * 命中時に呼ばれる。加点する得点を返す (0 = 加点なし)。
   * トリガーなどの「撃つと何かが起きる」処理もここで行う。
   */
  onHit(target: Target): number;
  /** シーン演出の動的状態 (任意)。 */
  getSceneState?(): SceneState;
  /** 弾を遮る障害物 (任意)。 */
  getObstacles?(): Obstacle[];
  /**
   * このフレームで起きた出来事を取り出す (取り出したら空になる)。
   * GameEngine が効果音・画面演出に使う。
   */
  consumeEvents?(): StageEventKind[];
}
