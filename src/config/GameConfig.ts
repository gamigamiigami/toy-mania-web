/**
 * GameConfig
 * 責務: ゲーム全体の定数を一元管理する (Data Driven / マジックナンバー禁止)。
 */
import { TargetType, type TemplateName } from '../core/types';

export const CameraConfig = {
  /** カメラ映像の論理解像度 (ゲーム座標の基準) */
  width: 1280,
  height: 720,
  facingMode: 'user' as const,
} as const;

export const MediaPipeConfig = {
  /**
   * HandLandmarker の WASM / モデル配信元。
   * インストール不要で動かすため CDN を利用する。
   */
  wasmBasePath:
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
  modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  numHands: 1,
  /** 人差し指先端の MediaPipe ランドマーク index */
  indexFingerTipLandmark: 8,
  /** 照準の基準点 = 手首 (landmark 0)。手首→指先の延長線で狙う。 */
  indexFingerBaseLandmark: 0,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
} as const;

export const PointingConfig = {
  /**
   * 指先の2D位置マッピング (z=奥行きは使わない=暴れない・安定優先)。
   * aim = 0.5 + (tip - center) * gain
   *  center: 画面中央に対応する指先の正規化位置(手が下めに映るならcenterYを上げる)。
   *  gain  : 大きいほど少しの指先移動で画面端まで届く。
   */
  centerX: 0.5,
  centerY: 0.5,
  gainX: 1.9,
  gainY: 1.9,
} as const;

export const CursorConfig = {
  /** SmoothDamp 相当の平滑化時間 (秒)。小さいほど追従が速い。高感度時の手ブレ抑制。 */
  smoothTime: 0.12,
  /** DeadZone 半径 (px)。微小なブレを無視する。 */
  deadZoneRadius: 4,
  radius: 28,
  colorTracking: '#00e5ff',
  colorLost: '#ff3b30',
  lineWidth: 3.5,
  /**
   * One Euro Filter のパラメータ (正規化座標 0..1 で適用)。
   *  minCutoff: 小さいほど静止時に強く平滑化(プルプル減)。ただし遅延が増える。
   *  beta     : 大きいほど素早い動きに即追従(遅延減)。
   */
  filterMinCutoff: 0.6,
  filterBeta: 1.5,
  filterDCutoff: 1.0,
} as const;

export const WeaponConfig = {
  /** カメラ操作(自動連射)の発射間隔 (秒)。 */
  fireIntervalSec: 0.5,
} as const;

export const RoundConfig = {
  /** 1ステージの制限時間 (秒)。経過で次ステージへ。 */
  durationSec: 30,
  /** 出発直後の練習ラウンド (得点はカウントされない) の時間 (秒)。 */
  practiceSec: 15,
  /** リザルト表示時間 (秒)。 */
  resultSec: 5,
} as const;

export const PlayerConfig = {
  /** プレイヤー色 (最大4人)。色で区別。 */
  colors: ['#00e5ff', '#ff3bd0', '#ffd60a', '#39d353'] as const,
  names: ['P1', 'P2', 'P3', 'P4'] as const,
  maxPlayers: 4,
} as const;

/** 得点階層 (本家準拠: 100 / 500 / 1000 / 2000、レアの 5000)。 */
export const ScoreTier = {
  low: 100,
  mid: 500,
  high: 1000,
  top: 2000,
  mega: 5000,
} as const;

/** 弾の種類 (ステージごとに変わる)。 */
export type ProjectileKind = 'pie' | 'egg' | 'dart' | 'ball' | 'ring' | 'suction';

export interface WeaponSpec {
  kind: ProjectileKind;
  label: string;
  emoji: string;
  /** 投擲初速 (ワールド単位/秒)。速いほど直線的。 */
  speed: number;
  /** この弾に働く重力 (ワールド単位/秒^2)。小さいほどまっすぐ飛ぶ。 */
  gravity: number;
  /** 弾のワールド半径。大きいほど当てやすい。 */
  radius: number;
}

/**
 * ステージごとの武器 (本家: パイ→卵→ダーツ→ボール→輪投げ→吸盤ダーツ)。
 */
export const WeaponsConfig: Record<TemplateName, WeaponSpec> = {
  practice: { kind: 'pie', label: 'パイなげ', emoji: '🥧', speed: 15, gravity: 9, radius: 0.34 },
  tiers: { kind: 'egg', label: 'たまごなげ', emoji: '🥚', speed: 18, gravity: 10, radius: 0.26 },
  gallery: { kind: 'dart', label: 'ダーツ', emoji: '🎯', speed: 26, gravity: 3, radius: 0.2 },
  orbit: { kind: 'ball', label: 'ベースボール', emoji: '⚾', speed: 22, gravity: 8, radius: 0.24 },
  curve: { kind: 'ring', label: 'わなげ', emoji: '⭕', speed: 14, gravity: 9, radius: 0.36 },
  mole: { kind: 'suction', label: 'きゅうばんダーツ', emoji: '🧲', speed: 24, gravity: 4, radius: 0.22 },
};

/** 固定トリガー的 (撃つとボーナス噴出) の共通型。 */
export interface TriggerSpec {
  x: number;
  y: number;
  z: number;
  tr: number;
  /** 撃たれてから再出現するまでの秒数。 */
  respawn: number;
}

/**
 * ステージごとのパラメータ。座標はワールド単位。
 * 本家の設計方針: 低得点=大きく遅い / 高得点=小さく速く短命。
 */
export const StagesConfig = {
  /** 練習ラウンド: 大きな静止的。得点は本番に持ち越されない。 */
  practice: {
    slots: [
      { x: -3.0, y: -0.6, z: 6 },
      { x: -1.0, y: 0.4, z: 6.5 },
      { x: 1.0, y: -0.4, z: 6.5 },
      { x: 3.0, y: 0.6, z: 6 },
      { x: -2.0, y: 1.4, z: 7.5 },
      { x: 0, y: 0.9, z: 8 },
      { x: 2.0, y: 1.6, z: 7.5 },
    ],
    tr: 0.8,
    score: ScoreTier.low,
    respawn: 0.6,
  },

  /** 3層ギャラリー: 手前スライド / 中ポップアップ / 奥カルーセル。 */
  gallery: {
    near: { z: 5, y: -0.9, speed: 2.2, count: 5, score: ScoreTier.low },
    midHoles: [
      { x: -2.6, y: 0.2, z: 7 },
      { x: 0, y: 0.7, z: 7.4 },
      { x: 2.6, y: 0.2, z: 7 },
    ],
    midLife: 2.2,
    midRespawn: 0.4,
    midScore: ScoreTier.mid,
    far: { cx: 0, cy: 1.2, z: 9, radius: 2.6, count: 4, speed: 1.0, score: ScoreTier.high, tr: 0.42 },
    /** 固定トリガー: カルーセルの上に鎮座。撃つとボーナス噴出。 */
    trigger: { x: 0, y: 2.4, z: 9.5, tr: 0.5, respawn: 8 } as TriggerSpec,
  },

  /** トリガー命中で噴き出す共通ボーナス(1000点)の設定。 */
  burst: { count: 6, life: 5, score: ScoreTier.high, tr: 0.42, spreadX: 4, yMin: -0.4, yMax: 2.2, z: 6.5, zSpread: 2 },
  /** 協力ギミック(2人が短時間に両方トリガー)で噴き出す特大ボーナス(2000点)。 */
  burstMega: { count: 10, life: 6, score: ScoreTier.top, tr: 0.4, spreadX: 5, yMin: -0.4, yMax: 2.6, z: 7, zSpread: 2.5 },

  /** 回転オービット塔: 中央の柱の周りを水平周回。柱が弾を遮る。 */
  orbit: {
    pillar: { x: 0, y: 0.4, z: 9, radius: 1.1 },
    rings: [
      { z: 9, r: 3.0, count: 7, speed: 0.9, score: ScoreTier.mid, tr: 0.55, cy: 0.2 },
      { z: 9, r: 1.9, count: 5, speed: 1.3, score: ScoreTier.high, tr: 0.4, cy: 1.5 },
    ],
    /** 固定トリガー: 塔のてっぺん。 */
    trigger: { x: 0, y: 2.7, z: 9, tr: 0.45, respawn: 8 } as TriggerSpec,
  },

  /** カーブ峡谷: 障害物の裏を輪投げの山なり軌道とカーブで狙う。 */
  curve: {
    obstacles: [
      { x: -1.3, y: 0.1, z: 7.5, radius: 1.0 },
      { x: 1.7, y: 0.6, z: 8.5, radius: 1.0 },
    ],
    targets: [
      { x: -3.0, y: 0.5, z: 9, score: ScoreTier.high, tr: 0.48 },
      { x: 3.1, y: 0.9, z: 9.5, score: ScoreTier.high, tr: 0.48 },
      { x: 0, y: -0.4, z: 6, score: ScoreTier.mid, tr: 0.62 },
      { x: -1.0, y: 1.6, z: 10, score: ScoreTier.top, tr: 0.38 },
      { x: 2.0, y: -0.2, z: 7, score: ScoreTier.mid, tr: 0.62 },
      { x: -2.4, y: -0.9, z: 6.2, score: ScoreTier.low, tr: 0.7 },
      { x: 3.6, y: 1.9, z: 10.5, score: ScoreTier.high, tr: 0.44 },
    ],
    respawn: 0.7,
    /** どのスロットをトリガー的にするか (撃つとボーナス噴出)。 */
    triggerSlots: [2],
  },

  /** ビッグ・フィナーレ: モグラ + 成長ターゲット + 終盤ボーナスタイム。 */
  mole: {
    cols: [-2.7, 0, 2.7],
    rows: [
      { yDown: -1.6, yUp: -0.4, z: 5.5, score: ScoreTier.low },
      { yDown: -1.4, yUp: 0.5, z: 8, score: ScoreTier.mid },
      { yDown: -1.2, yUp: 1.4, z: 10.5, score: ScoreTier.high },
    ],
    riseSec: 0.2,
    holdSec: 1.7,
    sinkSec: 0.2,
    gapSec: 0.3,
    active: 6,
    tr: 0.6,
    /** 固定トリガー: 左端の地上。 */
    trigger: { x: -4.2, y: 0.0, z: 7, tr: 0.5, respawn: 8 } as TriggerSpec,
    /**
     * 本家ウッディのボーナスラウンド再現: 残り finaleSec 秒からボーナスタイム。
     * 全穴が高速出没になり、得点が残り時間に応じてエスカレートする。
     */
    finale: {
      startSec: 10,
      riseSec: 0.12,
      holdSec: 0.8,
      sinkSec: 0.12,
      gapSec: 0.05,
      active: 9,
      /** 残り秒数がこの値以下なら対応する得点 (降順で判定)。 */
      escalation: [
        { under: 3, score: ScoreTier.top },
        { under: 6, score: ScoreTier.high },
        { under: 10, score: ScoreTier.mid },
      ],
    },
    /**
     * 最終ステージの「撃つほど得点UPする的」: 撃つたび得点UP＆半径ダウン。
     * minRadius まで小さくなるとフィニッシュ(大量得点)→respawnで再登場。
     */
    rising: {
      x: 0, y: 0.7, z: 6.5,
      startValue: ScoreTier.mid, increment: 250,
      startRadius: 1.0, shrink: 0.06, minRadius: 0.3,
      respawn: 1.5,
    },
  },

  /**
   * ひな壇シューティング: 手前から奥へ段が上がる。各段に的が乗り左右スライド。
   * 奥の段ほど高く・小さく・速く・高得点 (本家の得点則)。
   */
  tiers: {
    floorY: -2.2,
    steps: [
      { y: -1.4, zNear: 5, zFar: 6.6, halfWidth: 5.0, count: 5, speed: 2.0, tr: 0.62, score: ScoreTier.low },
      { y: -0.2, zNear: 7.0, zFar: 8.6, halfWidth: 4.6, count: 4, speed: 2.6, tr: 0.52, score: ScoreTier.mid },
      { y: 1.0, zNear: 9.2, zFar: 10.8, halfWidth: 4.2, count: 3, speed: 3.2, tr: 0.42, score: ScoreTier.high },
      { y: 2.2, zNear: 11.5, zFar: 13.0, halfWidth: 3.6, count: 2, speed: 3.8, tr: 0.32, score: ScoreTier.top },
    ],
    respawn: 0.4,
    /** 固定トリガー: 右端・2段目の高さ。 */
    trigger: { x: 4.4, y: 0.3, z: 7.8, tr: 0.5, respawn: 8 } as TriggerSpec,
  },
} as const;

/** たまに横切る特大ボーナス的 (5000点)。高速で画面を通過する。 */
export const StreakerConfig = {
  score: ScoreTier.mega,
  /** 次の出現までの間隔 (秒、この範囲でランダム)。 */
  intervalMin: 16,
  intervalMax: 32,
  speed: 9,
  z: 12.5,
  y: 2.0,
  tr: 0.5,
  /** この |x| を超えたら退場。 */
  xEdge: 9,
} as const;

/** 協力ギミック: 異なる2人が windowSec 以内に両方トリガーを撃つと特大ボーナス解放。 */
export const CoopConfig = {
  windowSec: 4,
} as const;

/** ステージ表示名・ローテーション順・カラーテーマ (画面の色味/バナー)。 */
export const STAGE_INFO: { name: string; label: string; theme: string }[] = [
  { name: 'tiers', label: 'ひな壇ストリート', theme: '#39d353' },
  { name: 'gallery', label: '3層ギャラリー', theme: '#4aa3df' },
  { name: 'orbit', label: '回転オービット塔', theme: '#b06ce9' },
  { name: 'curve', label: 'カーブ峡谷', theme: '#ff9f0a' },
  { name: 'mole', label: 'ビッグ・フィナーレ', theme: '#ff453a' },
];

/** 練習ラウンドの表示情報。 */
export const PRACTICE_INFO = { label: 'れんしゅうラウンド', theme: '#8e8e93' } as const;

export const ControllerConfig = {
  sensX: 0.03,
  sensY: 0.03,
  /** 向きの符号 (鏡像/上下が逆なら反転)。 */
  signX: -1,
  signY: -1,
  /** スワイプ発射と判定する最小の上方向移動量 (px)。 */
  swipeMinDist: 28,
} as const;

/**
 * 3D ワールド設定。
 * x:右+ / y:上+ / z:奥+。カメラは原点(0,0,0)で +z 方向を向く。
 * プレイヤーはカメラ手前に立ち、画面の奥(+z)に広がるエリアへ投げ込む。
 */
export const WorldConfig = {
  /** 垂直画角 (度)。透視投影の強さ。 */
  fovVDeg: 55,
  /** 重力加速度の既定値 (武器ごとに上書き)。 */
  gravity: 10,
  /** 投擲初速の既定値 (武器ごとに上書き)。 */
  throwSpeed: 18,
  /** 投擲の発射元 (カメラ少し下=手元のイメージ)。 */
  muzzle: { x: 0, y: -0.5, z: 0.3 },
  /** ボールのワールド半径の既定値 (武器ごとに上書き)。 */
  ballRadius: 0.24,
  ballColor: '#00e5ff',
  /** 軌跡 (Trail) の生存時間 (秒)。外した方向を線として残す。 */
  trailLifeSec: 0.12,
  /**
   * 当たり判定の倍率。本家準拠で甘め (当てるのは簡単、
   * 高得点の的を選び続けるのが難しい、という難易度設計)。
   */
  hitboxMultiplier: 0.95,
  /** 床の高さ。これより下に落ちたら消す。 */
  floorY: -4,
  /** これより奥(z)へ行ったら消す (的の後ろを通過)。 */
  maxZ: 22,
  /** 念のための最大生存時間 (秒)。 */
  maxLifeSec: 4,
  /** スワイプの斜め量(-1..1)に掛ける横加速。大きいほど曲がる。 */
  curveAccel: 26,
} as const;

/**
 * アリーナ(共通3D空間)設定。床グリッドや誘導ガイドの見た目と範囲。
 */
export const ArenaConfig = {
  /** 左右幅 (中心からの半幅)。スライダーの折返しにも使う。 */
  halfWidth: 6,
  gridColor: 'rgba(120, 180, 255, 0.16)',
  guideColor: 'rgba(120, 180, 255, 0.30)',
  /** 的を地面につなぐスタンド線の色 (距離の手掛かり)。 */
  standColor: 'rgba(120, 180, 255, 0.30)',
  gridZStart: 2,
  gridZEnd: 16,
  gridStep: 1.5,
} as const;

/**
 * ターゲット共通設定 + 分類ごとの色・得点。
 */
export const TargetConfig = {
  /** 既定のワールド半径。 */
  radius: 0.55,
  /** Hit フラッシュ表示時間 (秒)。 */
  hitFlashSec: 0.15,
  /** 出現アニメ(起き上がり)の時間 (秒)。 */
  spawnRiseSec: 0.35,
  /** 分類ごとの色。 */
  colors: {
    [TargetType.Normal]: '#ffd60a',
    [TargetType.HighValue]: '#ff9f0a',
    [TargetType.Trigger]: '#30d1ff',
    [TargetType.Bonus]: '#ff2d55',
  } as Record<TargetType, string>,
  /** 分類ごとの既定得点。 */
  scores: {
    [TargetType.Normal]: ScoreTier.low,
    [TargetType.HighValue]: ScoreTier.mid,
    [TargetType.Trigger]: ScoreTier.low,
    [TargetType.Bonus]: ScoreTier.high,
  } as Record<TargetType, number>,
} as const;

export const FeedbackConfig = {
  /** Hit マーカーの表示時間 (秒) と色。 */
  hitMarkerLifeSec: 0.5,
  hitMarkerColor: '#30d158',
  /** フローティングスコアの表示時間 (秒) と上昇量 (px)。 */
  scoreTextLifeSec: 0.75,
  scoreFloatPx: 64,
  scoreColor: '#ffffff',
  scoreColorBig: '#ffd60a',
  /** この得点以上は大きく強調表示。 */
  bigScoreThreshold: 500,
  /** 命中で割れる破片の数・寿命・初速・落下・色。 */
  debrisCount: 12,
  debrisLifeSec: 0.4,
  debrisSpeed: 420,
  debrisGravity: 900,
  debrisColors: ['#d33a2c', '#f2e6c2', '#ffffff', '#ffd60a'],
  /** リザルトの紙吹雪。 */
  confettiCount: 90,
  confettiLifeSec: 2.6,
  confettiColors: ['#ffd60a', '#ff3bd0', '#00e5ff', '#39d353', '#ffffff', '#ff9f0a'],
} as const;

/** 画像アセット (背景・的スプライトシート)。public/scene/ に配置。 */
export const AssetConfig = {
  backgroundPath: 'scene/background.png',
  targetsPath: 'scene/targets.png',
  /** 的シートの分割数 (3×3 = 9アイコン)。 */
  sheetCols: 3,
  sheetRows: 3,
  /**
   * 各アイコン(赤いリング)の中心と半径。画像を解析して算出した正規化値
   * [中心x, 中心y, 半径] (いずれも画像サイズに対する比率)。
   * これで白余白なく赤い丸ぴったりに切り抜ける。
   */
  iconRects: [
    [0.2173, 0.2095, 0.0933],
    [0.5, 0.2095, 0.0938],
    [0.7856, 0.2095, 0.0933],
    [0.2168, 0.5015, 0.0913],
    [0.5, 0.5, 0.0918],
    [0.7856, 0.4961, 0.0923],
    [0.2173, 0.8027, 0.0923],
    [0.4995, 0.8027, 0.0923],
    [0.7856, 0.8008, 0.0923],
  ] as ReadonlyArray<readonly [number, number, number]>,
  /** 半径に掛ける余裕 (1.0=赤リング外周ぴったり)。 */
  iconPad: 1.02,
} as const;
