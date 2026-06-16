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
  /** 人差し指付け根 (MCP) の MediaPipe ランドマーク index。指の向きの基準点。 */
  indexFingerBaseLandmark: 5,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
} as const;

export const PointingConfig = {
  /**
   * レーザーポインター方式の延長率。
   * 付け根→指先のベクトルを指先からさらに延長してカーソル位置を求める。
   * 大きいほど少しの傾きで大きく動く (Wiiリモコン的)。0 にすると指先位置そのもの。
   */
  extension: 2.5,
} as const;

export const CursorConfig = {
  /** SmoothDamp 相当の平滑化時間 (秒)。小さいほど追従が速い。 */
  smoothTime: 0.08,
  /** DeadZone 半径 (px)。微小なブレを無視する。 */
  deadZoneRadius: 4,
  radius: 18,
  colorTracking: '#00e5ff',
  colorLost: '#ff3b30',
  lineWidth: 3,
} as const;

export const WeaponConfig = {
  /** 発射レート: 2発/秒 → 発射間隔 0.5秒 */
  fireIntervalSec: 0.5,
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
  ballRadius: 0.3,
  ballColor: '#00e5ff',
  /** 軌跡 (Trail) の生存時間 (秒)。外した方向を線として残す。 */
  trailLifeSec: 0.12,
  /** 当たり判定の倍率 (ガバガバ判定)。 */
  hitboxMultiplier: 1.4,
  /** 床の高さ。これより下に落ちたら消す。 */
  floorY: -4,
  /** これより奥(z)へ行ったら消す (的の後ろを通過)。 */
  maxZ: 22,
  /** 念のための最大生存時間 (秒)。 */
  maxLifeSec: 4,
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
  default: 'sliders' as TemplateName,

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
} as const;

export const ScoreConfig = {
  /** 連続命中の表示リセットまでの猶予 (秒)。 */
  comboWindowSec: 2,
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
} as const;
