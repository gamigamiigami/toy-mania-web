/**
 * WeaponSpec
 * 責務: ステージごとに変わる投擲武器の性能定義 (Data Driven)。
 *       弾道 = 初速 × 重力倍率 × 空気抵抗 で性格を変える。
 */

export type WeaponKind = 'pie' | 'egg' | 'dart' | 'ball' | 'ring' | 'suction';

export interface WeaponSpec {
  readonly kind: WeaponKind;
  /** HUD 表示名。 */
  readonly label: string;
  /** 初速 (ワールド単位/秒)。 */
  readonly speed: number;
  /** 重力倍率 (WorldConfig.gravity に掛ける)。大=山なり、小=直線。 */
  readonly gravityScale: number;
  /** 空気抵抗 (0=なし)。輪のふわり感に使う。 */
  readonly drag: number;
  /** 弾のワールド半径 (当たり判定にも使う)。 */
  readonly radius: number;
  /** 自動連射の間隔 (秒)。小さいほど連射。 */
  readonly fireIntervalSec: number;
  /** 弾の基本色。 */
  readonly color: string;
}

export const Weapons: Record<WeaponKind, WeaponSpec> = {
  /** パイ: 大きくて当てやすい練習用。ゆったり山なり。 */
  pie: {
    kind: 'pie',
    label: 'パイ',
    speed: 15,
    gravityScale: 1.0,
    drag: 0,
    radius: 0.34,
    fireIntervalSec: 0.5,
    color: '#f6e3b4',
  },
  /** 卵: 重力でしっかり山なり。上を狙って落とし込む楽しさ。 */
  egg: {
    kind: 'egg',
    label: 'たまご',
    speed: 16,
    gravityScale: 1.0,
    drag: 0,
    radius: 0.26,
    fireIntervalSec: 0.45,
    color: '#fff6e0',
  },
  /** ダーツ: 高速・ほぼ直線。狙ったところに刺さる。 */
  dart: {
    kind: 'dart',
    label: 'ダーツ',
    speed: 26,
    gravityScale: 0.15,
    drag: 0,
    radius: 0.18,
    fireIntervalSec: 0.4,
    color: '#ffd60a',
  },
  /** ボール: 最速で皿を撃ち抜く。 */
  ball: {
    kind: 'ball',
    label: 'ボール',
    speed: 30,
    gravityScale: 0.5,
    drag: 0,
    radius: 0.22,
    fireIntervalSec: 0.4,
    color: '#f2f2f2',
  },
  /** 輪: 遅くてふわり。空気抵抗で減速しながら届く。半径大=当てやすい。 */
  ring: {
    kind: 'ring',
    label: 'リング',
    speed: 12,
    gravityScale: 0.4,
    drag: 0.35,
    radius: 0.5,
    fireIntervalSec: 0.55,
    color: '#30d1ff',
  },
  /** 吸盤ダーツ: 高速連射。射的場の主役。 */
  suction: {
    kind: 'suction',
    label: '吸盤ダーツ',
    speed: 24,
    gravityScale: 0.3,
    drag: 0,
    radius: 0.2,
    fireIntervalSec: 0.25,
    color: '#ff9f0a',
  },
} as const;
