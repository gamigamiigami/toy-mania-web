/**
 * GameConfig
 * 責務: ゲーム全体の定数を一元管理する (Data Driven / マジックナンバー禁止)。
 */
import { TargetType, type TemplateName } from '../core/types';
import type { WeaponKind } from '../weapon/WeaponSpec';

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
   */
  centerX: 0.5,
  centerY: 0.5,
  gainX: 1.9,
  gainY: 1.9,
} as const;

export const CursorConfig = {
  /** SmoothDamp 相当の平滑化時間 (秒)。 */
  smoothTime: 0.12,
  /** DeadZone 半径 (px)。 */
  deadZoneRadius: 4,
  radius: 28,
  colorTracking: '#00e5ff',
  colorLost: '#ff3b30',
  lineWidth: 3.5,
  /** One Euro Filter のパラメータ。 */
  filterMinCutoff: 0.6,
  filterBeta: 1.5,
  filterDCutoff: 1.0,
} as const;

export const RoundConfig = {
  /** 1ステージの既定制限時間 (秒)。STAGE_INFO 側の指定が優先。 */
  durationSec: 30,
} as const;

export const PlayerConfig = {
  /** プレイヤー色 (最大4人)。色で区別。 */
  colors: ['#00e5ff', '#ff3bd0', '#ffd60a', '#39d353'] as const,
  names: ['P1', 'P2', 'P3', 'P4'] as const,
  maxPlayers: 4,
} as const;

/**
 * 得点体系 (本家準拠)。的に数字を表示し、視線誘導の手掛かりにする。
 */
export const ScoreValue = {
  low: 100,
  mid: 500,
  high: 1000,
  top: 2000,
} as const;

/**
 * 3D ワールド設定。
 * x:右+ / y:上+ / z:奥+。カメラは原点(0,0,0)で +z 方向を向く。
 */
export const WorldConfig = {
  /** 垂直画角 (度)。 */
  fovVDeg: 55,
  /** 基準重力加速度 (WeaponSpec.gravityScale を掛けて使う)。 */
  gravity: 10,
  /** 投擲の発射元 (カメラ少し下=手元のイメージ)。 */
  muzzle: { x: 0, y: -0.5, z: 0.3 },
  /** 軌跡 (Trail) の生存時間 (秒)。外した方向の手掛かり。 */
  trailLifeSec: 0.12,
  /** 当たり判定の倍率。 */
  hitboxMultiplier: 0.9,
  /** 床の高さ。これより下に落ちたら消す。 */
  floorY: -2.6,
  /** これより奥(z)へ行ったら消す。 */
  maxZ: 22,
  /** 念のための最大生存時間 (秒)。 */
  maxLifeSec: 4,
  /** スワイプの斜め量(-1..1)に掛ける横加速。 */
  curveAccel: 26,
} as const;

/** アリーナ(共通3D空間)設定。 */
export const ArenaConfig = {
  /** 左右幅 (中心からの半幅)。スライダーの折返しにも使う。 */
  halfWidth: 5.5,
} as const;

/**
 * ターゲット共通設定 + 分類ごとの色・既定得点 (本家準拠の点数体系)。
 */
export const TargetConfig = {
  /** 既定のワールド半径。 */
  radius: 0.55,
  /** Hit フラッシュ表示時間 (秒)。 */
  hitFlashSec: 0.15,
  /** 出現アニメ(起き上がり)の時間 (秒)。 */
  spawnRiseSec: 0.35,
  colors: {
    [TargetType.Normal]: '#ffd60a',
    [TargetType.HighValue]: '#ff9f0a',
    [TargetType.Trigger]: '#30d1ff',
    [TargetType.Bonus]: '#ff2d55',
  } as Record<TargetType, string>,
  scores: {
    [TargetType.Normal]: ScoreValue.low,
    [TargetType.HighValue]: ScoreValue.mid,
    [TargetType.Trigger]: ScoreValue.low,
    [TargetType.Bonus]: ScoreValue.high,
  } as Record<TargetType, number>,
} as const;

/**
 * ステージ表示名・武器・制限時間・巡回順 (本家アトラクションの7シーン)。
 */
export const STAGE_INFO: {
  name: TemplateName;
  label: string;
  weapon: WeaponKind;
  durationSec: number;
}[] = [
  { name: 'practice', label: '練習: パイなげ', weapon: 'pie', durationSec: 15 },
  { name: 'eggfarm', label: 'たまご牧場', weapon: 'egg', durationSec: 30 },
  { name: 'balloon', label: '風船火山', weapon: 'dart', durationSec: 30 },
  { name: 'plates', label: '皿割りキャンプ', weapon: 'ball', durationSec: 30 },
  { name: 'rings', label: 'リングトス宇宙港', weapon: 'ring', durationSec: 30 },
  { name: 'gallery', label: '西部の射的場', weapon: 'suction', durationSec: 30 },
  { name: 'bonus', label: 'ボーナスラウンド', weapon: 'suction', durationSec: 20 },
];

/**
 * ステージごとのパラメータ。座標はワールド単位 (x右 / y上 / z奥)。
 * 床は y = WorldConfig.floorY (-2.6)。
 */
export const StagesConfig = {
  /** 練習: 静止した大きな的だけ。腕慣らし。 */
  practice: {
    slots: [
      { x: -3.4, y: -0.6, z: 6.5 },
      { x: 0, y: -0.9, z: 6 },
      { x: 3.4, y: -0.6, z: 6.5 },
      { x: -1.8, y: 0.8, z: 8.5 },
      { x: 1.8, y: 0.8, z: 8.5 },
      { x: 0, y: 2.0, z: 11 },
    ],
    radius: 0.8,
    respawnSec: 0.8,
  },

  /** たまご牧場: 柵から出没するイタチ / 歩くブタ・ヒツジ / 飛ぶトリ / 屋根のキツネ。 */
  eggfarm: {
    /** イタチ: 手前の柵の陰から出没 (モグラ式)。 */
    weasels: {
      spots: [
        { x: -3.2, z: 6.5 },
        { x: -1.1, z: 6.5 },
        { x: 1.1, z: 6.5 },
        { x: 3.2, z: 6.5 },
      ],
      yDown: -2.4,
      yUp: -1.1,
      riseSec: 0.25,
      holdSec: 1.6,
      sinkSec: 0.25,
      gapSec: 0.4,
      active: 3,
      radius: 0.5,
      score: ScoreValue.low,
    },
    /** ブタ・ヒツジ: 地面を左右に歩く板的。 */
    walkers: [
      { z: 9, y: -1.5, speed: 2.2, count: 2, style: 'pig' as const, score: ScoreValue.low },
      { z: 11, y: -1.3, speed: 2.8, count: 2, style: 'sheep' as const, score: ScoreValue.mid },
    ],
    /** トリ: サインカーブで空を飛ぶ。小さく速い=高得点。 */
    flyers: { z: 13, baseY: 2.1, amp: 0.7, speed: 3.2, count: 2, xRange: 5, radius: 0.42, score: ScoreValue.high },
    /** キツネ (トリガー): 納屋の屋根の上に静止。撃つと扉が開きニワトリ解放。 */
    fox: { x: 0, y: 2.2, z: 12.2, radius: 0.45, score: ScoreValue.mid },
    foxRespawnSec: 10,
    /** ニワトリ (ボーナス): 扉が開いて出現。 */
    chickens: {
      positions: [
        { x: -1.5, y: -1.2, z: 10.6 },
        { x: -0.75, y: -0.7, z: 10.6 },
        { x: 0, y: -1.0, z: 10.6 },
        { x: 0.75, y: -0.7, z: 10.6 },
        { x: 1.5, y: -1.2, z: 10.6 },
      ],
      radius: 0.42,
      score: ScoreValue.high,
      windowSec: 8,
    },
    walkerRespawnSec: 0.8,
    /** 納屋の位置 (シーン装飾 + 扉開閉の基準)。 */
    barn: { x: 0, z: 12 },
  },

  /** 風船火山: 浮かんで昇る風船。溶岩風船を全部割ると噴火→高得点風船が大量に。 */
  balloon: {
    /** 通常風船: 下から湧いてゆっくり上昇、ゆらゆら。 */
    normal: {
      active: 9,
      spawnY: -2.2,
      topY: 3.2,
      riseSpeed: [0.5, 1.0] as const,
      swayAmp: 0.5,
      swaySpeed: 1.6,
      xRange: 5,
      zRange: [6, 12] as const,
      radius: 0.5,
      /** 得点分布: 大半100、たまに500。 */
      midChance: 0.25,
    },
    /** 溶岩風船 (トリガー): 火山の周りに3個。全部割ると噴火。 */
    lava: {
      positions: [
        { x: -1.6, y: 0.9, z: 10.5 },
        { x: 0, y: 1.8, z: 11 },
        { x: 1.6, y: 0.9, z: 10.5 },
      ],
      radius: 0.42,
      score: ScoreValue.mid,
      /** 全滅→噴火の後、再配置までの秒数。 */
      resetSec: 6,
    },
    /** 噴火: 高得点風船が火口から一斉に噴き出す。 */
    eruption: {
      count: 10,
      score: ScoreValue.high,
      radius: 0.45,
      lifeSec: 6,
      /** 火口の位置。 */
      vent: { x: 0, y: 2.2, z: 11.5 },
      spreadX: 4,
      riseSpeed: [1.2, 2.2] as const,
    },
    /** 火山の位置 (シーン装飾)。 */
    volcano: { x: 0, z: 12 },
  },

  /** 皿割りキャンプ: 棚の皿 + ベルトコンベアで流れる皿。5枚割るごとに皿の山。 */
  plates: {
    /** 棚 (固定皿)。奥ほど小さく高得点。 */
    shelves: [
      { y: 0.2, z: 8, xs: [-4, -2.4, -0.8, 0.8, 2.4, 4], radius: 0.5, score: ScoreValue.low },
      { y: 1.5, z: 10.5, xs: [-3.2, -1.6, 0, 1.6, 3.2], radius: 0.42, score: ScoreValue.mid },
    ],
    shelfRespawnSec: 1.2,
    /** コンベア (流れる皿)。 */
    conveyor: { y: -1.2, z: 6.5, speed: 2.6, count: 3, radius: 0.5, score: ScoreValue.low },
    /** 皿の山 (ボーナス): 連続5枚で出現。 */
    stack: {
      streak: 5,
      position: { x: 0, y: 0.4, z: 9 },
      radius: 0.85,
      score: ScoreValue.top,
      lifeSec: 5,
    },
  },

  /** リングトス宇宙港: 中央ロケットの周りをエイリアンが周回。コアを撃つとロケット発射。 */
  rings: {
    /** ロケット (柱として弾を遮る)。 */
    rocket: { x: 0, y: 0.2, z: 10, radius: 0.9 },
    orbits: [
      { z: 10, r: 3.2, count: 6, speed: 0.7, cy: -0.8, radius: 0.55, score: ScoreValue.low },
      { z: 10, r: 2.2, count: 4, speed: 1.0, cy: 1.0, radius: 0.48, score: ScoreValue.mid },
    ],
    /** ロボットの胸コア (トリガー): ロケット手前に静止。 */
    core: { x: 0, y: -1.3, z: 8, radius: 0.42, score: ScoreValue.mid },
    coreRespawnSec: 9,
    /** ロケット発射で現れるボーナスエイリアン。 */
    launchBonus: {
      count: 6,
      score: ScoreValue.high,
      radius: 0.5,
      lifeSec: 5,
      y: [0.5, 2.6] as const,
      xRange: 4,
      z: 9,
    },
  },

  /** 西部の射的場: スライド板的 / 窓から出没 / トロッコ。星を撃つとコウモリ群。 */
  gallery: {
    sliders: [
      { z: 7, y: -1.1, speed: 2.4, count: 3, radius: 0.55, score: ScoreValue.low },
      { z: 9.5, y: 0.2, speed: 3.0, count: 3, radius: 0.48, score: ScoreValue.mid },
    ],
    sliderRespawnSec: 0.6,
    /** 窓ポップアップ。 */
    windows: {
      spots: [
        { x: -2.8, y: 1.4, z: 11.5 },
        { x: 0, y: 1.7, z: 12 },
        { x: 2.8, y: 1.4, z: 11.5 },
      ],
      lifeSec: 1.8,
      respawnSec: 0.5,
      radius: 0.45,
      score: ScoreValue.mid,
    },
    /** トロッコ: レール上を速く横切る。 */
    cart: { z: 13.5, y: -1.6, speed: 4.2, radius: 0.6, score: ScoreValue.high, gapSec: 1.2 },
    /** 星 (トリガー): 屋根の上。撃つとコウモリ群。 */
    star: { x: 0, y: 2.8, z: 12.5, radius: 0.4, score: ScoreValue.mid },
    starRespawnSec: 10,
    bats: {
      count: 6,
      score: ScoreValue.mid,
      radius: 0.4,
      lifeSec: 6,
      baseY: 1.8,
      amp: 0.7,
      speed: 3.6,
      z: 10,
      xRange: 5,
    },
  },

  /** ボーナスラウンド: トロッコ + 出没的 + 中央の成長ターゲット。 */
  bonus: {
    carts: [
      { z: 8, y: -1.5, speed: 3.6, radius: 0.55, score: ScoreValue.low, gapSec: 0.9 },
      { z: 12, y: -1.0, speed: 4.6, radius: 0.5, score: ScoreValue.mid, gapSec: 1.1 },
    ],
    popups: {
      spots: [
        { x: -3.6, y: 0.6, z: 10 },
        { x: 3.6, y: 0.6, z: 10 },
        { x: -2.2, y: 1.9, z: 12 },
        { x: 2.2, y: 1.9, z: 12 },
      ],
      lifeSec: 1.6,
      respawnSec: 0.4,
      radius: 0.45,
      score: ScoreValue.mid,
    },
    /**
     * 成長ターゲット: 撃つたび得点UP＆縮小。minRadius まで縮むとフィニッシュ。
     * 500 → 1000 → 1500 → ... → 上限5000。
     */
    grow: {
      x: 0,
      y: 0.6,
      z: 7.5,
      startValue: ScoreValue.mid,
      increment: 500,
      maxValue: 5000,
      startRadius: 0.95,
      shrink: 0.07,
      minRadius: 0.35,
      respawnSec: 1.5,
    },
  },
} as const;

export const ControllerConfig = {
  sensX: 0.03,
  sensY: 0.03,
  /** 向きの符号 (鏡像/上下が逆なら反転)。 */
  signX: -1,
  signY: -1,
  /** スワイプ発射と判定する最小の上方向移動量 (px)。 */
  swipeMinDist: 28,
} as const;

export const ScoreConfig = {
  /** 連続命中の表示リセットまでの猶予 (秒)。表示のみで加点倍率はなし (本家準拠)。 */
  comboWindowSec: 2.5,
} as const;

export const FeedbackConfig = {
  /** Hit マーカーの表示時間 (秒)。 */
  hitMarkerLifeSec: 0.5,
  hitMarkerColor: '#30d158',
  /** フローティングスコアの表示時間 (秒) と上昇量 (px)。 */
  scoreTextLifeSec: 0.75,
  scoreFloatPx: 64,
  scoreColor: '#ffffff',
  scoreColorBig: '#ffd60a',
  /** この得点以上は大きく強調表示。 */
  bigScoreThreshold: 500,
  /** 命中で割れる破片。 */
  debrisCount: 12,
  debrisLifeSec: 0.4,
  debrisSpeed: 420,
  debrisGravity: 900,
  debrisColors: ['#d33a2c', '#f2e6c2', '#ffffff', '#ffd60a'],
} as const;

/** リザルトのランク称号 (命中率で決定)。 */
export const RankConfig = {
  ranks: [
    { minAccuracy: 0.55, title: 'スーパースター' },
    { minAccuracy: 0.4, title: 'シューティングマスター' },
    { minAccuracy: 0.25, title: 'いい腕前' },
    { minAccuracy: 0.1, title: 'みならい' },
    { minAccuracy: 0, title: 'これから' },
  ],
  highScoreKey: 'toy-mania-web:highscore',
} as const;
