/**
 * GameConfig
 * 責務: ゲーム全体の定数を一元管理する (Data Driven / マジックナンバー禁止)。
 */

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

export const TargetConfig = {
  /** ターゲットのワールド半径。 */
  radius: 0.7,
  /** 同時に存在するターゲット数 (最小3Dコアは1個)。 */
  maxCount: 1,
  /** 命中後に再出現するまでの待機 (秒) */
  respawnDelaySec: 0.4,
  /** スポーン範囲 (ワールド座標)。 */
  xRange: 3,
  yMin: -1,
  yMax: 2.5,
  /** 奥行きの範囲 (近い〜遠い)。遠いほど重力で落ちるので上を狙う必要がある。 */
  zMin: 6,
  zMax: 15,
  color: '#ffd60a',
  colorHit: '#ffffff',
  /** Hit 状態の表示時間 (秒) */
  hitFlashSec: 0.15,
} as const;

export const ScoreConfig = {
  /** ターゲット命中時の加算スコア */
  perHit: 100,
} as const;

export const FeedbackConfig = {
  /** 着弾マーカー (Miss) の表示時間 (秒) */
  missMarkerLifeSec: 0.7,
  missMarkerRadius: 16,
  missMarkerColor: '#ff9f0a',
  /** Hit マーカーの表示時間 (秒) */
  hitMarkerLifeSec: 0.5,
  hitMarkerColor: '#30d158',
  /** 発射ごとの曳光線 (レーザー) の表示時間 (秒) */
  shotLifeSec: 0.12,
  shotColor: '#ff2d55',
  shotWidth: 4,
  /** 曳光線の発射元 (画面下端中央からの相対位置 0..1) */
  muzzleX: 0.5,
  muzzleY: 1.05,
} as const;
