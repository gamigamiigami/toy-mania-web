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
  radius: 18,
  colorTracking: '#00e5ff',
  colorLost: '#ff3b30',
  lineWidth: 3,
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
  /** 発射レート: 2発/秒 → 発射間隔 0.5秒 */
  fireIntervalSec: 0.5,
} as const;

export const RoundConfig = {
  /** 1ステージの制限時間 (秒)。経過で次ステージ(今は同ステージ)へ。 */
  durationSec: 30,
  /** リザルト表示時間 (秒)。 */
  resultSec: 5,
} as const;

export const PlayerConfig = {
  /** プレイヤー色 (最大4人)。色で区別。 */
  colors: ['#00e5ff', '#ff3bd0', '#ffd60a', '#39d353'] as const,
  names: ['P1', 'P2', 'P3', 'P4'] as const,
  maxPlayers: 4,
} as const;

/** 得点階層。距離/サイズ/動きで差をつける。 */
export const ScoreTier = {
  low: 100,
  mid: 300,
  high: 600,
  top: 1000,
} as const;

/**
 * ステージごとのパラメータ (ラフ)。座標はワールド単位。
 */
export const StagesConfig = {
  /** 3層ギャラリー: 手前スライド / 中ポップアップ / 奥カルーセル。当てやすめ・高密度。 */
  gallery: {
    near: { z: 5, y: -0.9, speed: 2.2, count: 4, score: ScoreTier.low },
    midHoles: [
      { x: -2.6, y: 0.2, z: 7 },
      { x: 0, y: 0.7, z: 7.4 },
      { x: 2.6, y: 0.2, z: 7 },
    ],
    midLife: 2.2,
    midRespawn: 0.4,
    midScore: ScoreTier.mid,
    far: { cx: 0, cy: 1.2, z: 9, radius: 2.6, count: 3, speed: 0.9, score: ScoreTier.high, tr: 0.7 },
  },

  /** 回転オービット塔: 中央の柱の周りを水平カルーセルで周回(手前↔奥)。柱は細め。 */
  orbit: {
    pillar: { x: 0, y: 0.4, z: 9, radius: 1.1 },
    rings: [
      { z: 9, r: 3.0, count: 6, speed: 0.8, score: ScoreTier.mid, tr: 0.78, cy: 0.2 },
      { z: 9, r: 1.9, count: 4, speed: 1.1, score: ScoreTier.high, tr: 0.6, cy: 1.5 },
    ],
  },

  /** カーブ迫りコース: 障害物の裏をカーブで狙う。障害物は小さめ・的は大きめ。 */
  curve: {
    obstacles: [
      { x: -1.3, y: 0.1, z: 7.5, radius: 1.0 },
      { x: 1.7, y: 0.6, z: 8.5, radius: 1.0 },
    ],
    targets: [
      { x: -3.0, y: 0.5, z: 9, score: ScoreTier.high },
      { x: 3.1, y: 0.9, z: 9.5, score: ScoreTier.high },
      { x: 0, y: -0.4, z: 6, score: ScoreTier.mid },
      { x: -1.0, y: 1.6, z: 10, score: ScoreTier.top },
      { x: 2.0, y: -0.2, z: 7, score: ScoreTier.mid },
    ],
    respawn: 0.7,
    tr: 0.85,
  },

  /** 立体モグラ叩き: 奥行き3段の穴から上下に出没。出現多め・長め=当てやすい。 */
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
    tr: 0.85,
  },

  /**
   * ひな壇シューティング: 手前から奥へ段が上がる。各段に的が乗り左右スライド。
   * 奥の段ほど高く・小さく・高得点。段の前後でオクルージョン＝奥行きが明確。
   */
  tiers: {
    floorY: -2.2,
    steps: [
      { y: -1.4, zNear: 5, zFar: 6.6, halfWidth: 5.0, count: 4, speed: 2.0, tr: 0.85, score: ScoreTier.low },
      { y: -0.2, zNear: 7.0, zFar: 8.6, halfWidth: 4.6, count: 3, speed: 2.6, tr: 0.72, score: ScoreTier.mid },
      { y: 1.0, zNear: 9.2, zFar: 10.8, halfWidth: 4.2, count: 3, speed: 3.0, tr: 0.6, score: ScoreTier.high },
      { y: 2.2, zNear: 11.5, zFar: 13.0, halfWidth: 3.6, count: 2, speed: 3.4, tr: 0.52, score: ScoreTier.top },
    ],
    respawn: 0.4,
  },
} as const;

/** ステージ表示名 と ローテーション順。 */
export const STAGE_INFO: { name: string; label: string }[] = [
  { name: 'tiers', label: 'ひな壇' },
  { name: 'gallery', label: '3層ギャラリー' },
  { name: 'orbit', label: '回転オービット塔' },
  { name: 'curve', label: 'カーブ迫りコース' },
  { name: 'mole', label: '立体モグラ叩き' },
];

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
  /** 重力加速度 (ワールド単位/秒^2、下方向)。遠い的ほど落下量が増える。 */
  gravity: 10,
  /** 投擲初速 (ワールド単位/秒)。照準方向(レイ)へこの速さで投げる。 */
  throwSpeed: 18,
  /** 投擲の発射元 (カメラ少し下=手元のイメージ)。 */
  muzzle: { x: 0, y: -0.5, z: 0.3 },
  /** ボールのワールド半径。 */
  ballRadius: 0.34,
  ballColor: '#00e5ff',
  /** 軌跡 (Trail) の生存時間 (秒)。外した方向を線として残す。 */
  trailLifeSec: 0.12,
  /** 当たり判定の倍率 (ガバガバ判定。大きいほど当てやすい)。 */
  hitboxMultiplier: 2.0,
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
  radius: 0.7,
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
  /** 分類ごとの得点。Bonus = 通常の5倍。 */
  scores: {
    [TargetType.Normal]: 100,
    [TargetType.HighValue]: 300,
    [TargetType.Trigger]: 100,
    [TargetType.Bonus]: 500,
  } as Record<TargetType, number>,
} as const;

/**
 * Phase1 ステージテンプレート設定。
 * いずれも X/Y/Z を使い、平面配置を避ける。
 */
export const TemplatesConfig = {
  default: 'photo' as TemplateName,

  /** Template1 横移動。レーンごとに z(奥) と y(高さ) を変える。 */
  sliders: {
    lanes: [
      { z: 4, y: -0.6, speed: 2.2, count: 2, type: TargetType.Normal },
      { z: 7, y: 0.7, speed: 3.0, count: 2, type: TargetType.Normal },
      { z: 11, y: 1.9, speed: 4.0, count: 1, type: TargetType.HighValue },
    ],
    respawnDelaySec: 0.6,
  },

  /** Template2 3×3 ポップアップ。行ごとに z(奥)・y(高さ) を変える。 */
  matrix: {
    rowZ: [4, 7, 10],
    rowY: [-0.6, 0.6, 1.7],
    cols: 3,
    xSpacing: 2.4,
    /** 同時表示数 */
    activeCount: 4,
    /** 出現時間 (秒) の範囲 */
    lifeMin: 2,
    lifeMax: 4,
    /** 消滅後の再出現待ち (秒) */
    respawnDelaySec: 0.4,
    highValueChance: 0.25,
    /** Trigger 出現率。撃つと Bonus が解放される。 */
    triggerChance: 0.12,
    /** Trigger で解放される Bonus の生存時間 (秒)。 */
    bonusLifeSec: 5,
  },

  /** Template5 連鎖。5個を XYZ バラバラに配置。 */
  chains: {
    positions: [
      { x: -3.2, y: -0.6, z: 4 },
      { x: 2.6, y: 0.9, z: 6 },
      { x: -1.4, y: 1.9, z: 9 },
      { x: 3.0, y: 0.1, z: 11 },
      { x: -3.0, y: 1.5, z: 13 },
    ],
    /** 連鎖達成で出現する Bonus の生存時間 (秒) と位置。 */
    bonusLifeSec: 5,
    bonusPos: { x: 0, y: 0.8, z: 7 },
  },

  /**
   * Ham & Eggs (本戦1面の再現)。牧場シーン + 動く的 + 隠しギミック。
   * キツネ(Trigger)を撃つと鶏小屋の扉が開き、ニワトリ(1000点)が飛び出す。
   */
  hameggs: {
    /** ポップアップ(イタチ): 手前の柵の陰から出現。 */
    weasels: {
      spots: [
        { x: -2.2, y: -3.0, z: 10.5 },
        { x: 0, y: -3.0, z: 10.5 },
        { x: 2.2, y: -3.0, z: 10.5 },
      ],
      holdSec: 2,
      respawnSec: 1,
    },
    /** 横移動(ブタ/ヒツジ): 左の柵沿いを等速で。 */
    sliders: { z: 12, y: -2.7, speed: 2.5, count: 2 },
    /** 上空(アヒル/トリ): サインカーブで飛行。 */
    flyers: { z: 17, baseY: 2.6, amp: 1.0, speed: 3, count: 2, xRange: 6 },
    /** トリガー(屋根のキツネ): 中央小屋の屋根に静止。 */
    fox: { x: 0, y: 1.7, z: 15 },
    /** ボーナス(小屋のニワトリ): 扉が開いて出現。 */
    chickens: {
      count: 5,
      positions: [
        { x: -1.6, y: -0.4, z: 14 },
        { x: -0.8, y: 0.2, z: 14 },
        { x: 0, y: -0.2, z: 14 },
        { x: 0.8, y: 0.3, z: 14 },
        { x: 1.6, y: -0.4, z: 14 },
      ],
      score: 1000,
      windowSec: 8,
    },
    /** 扉の開閉アニメ時間 (秒)。 */
    doorOpenSec: 0.4,
    /** 風車の回転速度 (rad/秒)。 */
    windmillSpeed: 1.2,
  },
} as const;

export const ScoreConfig = {
  /** 連続命中の表示リセットまでの猶予 (秒)。 */
  comboWindowSec: 2.5,
  /** コンボ倍率: comboStep ヒットごとに +comboBonus、上限 comboMax 倍。 */
  comboStep: 4,
  comboBonus: 0.5,
  comboMax: 4,
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
  bigScoreThreshold: 300,
  /** 命中で割れる破片の数・寿命・初速・落下・色。 */
  debrisCount: 12,
  debrisLifeSec: 0.4,
  debrisSpeed: 420,
  debrisGravity: 900,
  debrisColors: ['#d33a2c', '#f2e6c2', '#ffffff', '#ffd60a'],
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

/**
 * PhotoFarm ステージ: 背景画像 + 的スプライト。
 * 的は固定3D位置(奥行きでサイズ差)に散らし、命中で消えて3秒後に再出現。
 */
export const PhotoFarmConfig = {
  respawnSec: 3,
  /** 的スロット。icon は的シートのインデックス(0..8)、z で大きさが変わる。 */
  slots: [
    { x: -3.0, y: 1.6, z: 6, icon: 0 },
    { x: 2.2, y: 2.1, z: 7, icon: 1 },
    { x: 0.2, y: 0.6, z: 9, icon: 2 },
    { x: -2.1, y: -0.4, z: 8, icon: 5 },
    { x: 3.0, y: 0.2, z: 10, icon: 8 },
    { x: -3.6, y: 1.0, z: 11, icon: 4 },
    { x: 1.6, y: 2.4, z: 13, icon: 3 },
    { x: -1.0, y: 2.0, z: 12, icon: 6 },
    { x: 3.4, y: -0.7, z: 14, icon: 7 },
  ],
} as const;
