import { WorldConfig } from '../config/GameConfig';
import type { Vec2, Vec3 } from './types';

/** 透視投影の結果 */
export interface Projected {
  /** スクリーン座標 (px) */
  x: number;
  y: number;
  /** ワールド長 → スクリーン px への倍率 (奥ほど小さい)。 */
  scale: number;
  /** カメラ前方にあり描画可能か。 */
  visible: boolean;
}

/**
 * Camera
 * 責務: ワールド3D座標とスクリーン2D座標の相互変換 (透視投影)。
 *       原点に置かれ +z 方向 (画面の奥) を向く固定カメラ。
 */
export class Camera {
  private readonly cx: number;
  private readonly cy: number;
  /** 焦点距離 (px)。fov と画面高さから算出。 */
  private readonly focal: number;

  constructor(width: number, height: number) {
    this.cx = width / 2;
    this.cy = height / 2;
    const fovRad = (WorldConfig.fovVDeg * Math.PI) / 180;
    this.focal = height / 2 / Math.tan(fovRad / 2);
  }

  /** ワールド点をスクリーンへ投影する。 */
  project(v: Vec3): Projected {
    if (v.z <= 0.05) {
      return { x: 0, y: 0, scale: 0, visible: false };
    }
    const scale = this.focal / v.z;
    return {
      x: this.cx + v.x * scale,
      y: this.cy - v.y * scale, // スクリーン y は下が正なので反転
      scale,
      visible: true,
    };
  }

  /**
   * スクリーン上の照準点を、カメラから奥へ伸びる単位方向ベクトル (レイ) に変換する。
   * これが投擲方向になる。
   */
  screenToRay(screen: Vec2): Vec3 {
    const dx = (screen.x - this.cx) / this.focal;
    const dy = (this.cy - screen.y) / this.focal; // 上を正に
    const len = Math.hypot(dx, dy, 1);
    return { x: dx / len, y: dy / len, z: 1 / len };
  }
}
