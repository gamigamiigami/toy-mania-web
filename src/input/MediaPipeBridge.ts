import {
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import { MediaPipeConfig, PointingConfig } from '../config/GameConfig';
import { TrackingState, type PointerResult, type Vec2 } from '../core/types';

/** 0..1 にクランプする。延長で画面外に出た狙いを端に留める。 */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * MediaPipeBridge
 * 責務: MediaPipe HandLandmarker の初期化と結果取得。
 * 出力: PointerResult (PointerPosition + TrackingState)。
 */
export class MediaPipeBridge {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;
  /** 直前の検出結果。同一映像フレームではこれを維持する(点滅防止)。 */
  private lastResult: PointerResult = {
    state: TrackingState.Lost,
    position: null,
  };

  /** モデルとランタイムを初期化する (CDN から取得)。 */
  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      MediaPipeConfig.wasmBasePath,
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MediaPipeConfig.modelAssetPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: MediaPipeConfig.numHands,
      minHandDetectionConfidence:
        MediaPipeConfig.minHandDetectionConfidence,
      minHandPresenceConfidence: MediaPipeConfig.minHandPresenceConfidence,
      minTrackingConfidence: MediaPipeConfig.minTrackingConfidence,
    });
  }

  /**
   * 1フレーム分の検出を行う。
   * @param video 再生中の HTMLVideoElement
   * @param timestampMs requestAnimationFrame の時刻
   */
  detect(video: HTMLVideoElement, timestampMs: number): PointerResult {
    if (!this.landmarker || video.readyState < 2) {
      return this.lastResult;
    }

    // 同一映像フレームでは推論せず、直前の結果を維持する。
    // (PCは描画ループがカメラfpsより速く、毎回Lostを返すと点滅・発射停止になる)
    if (video.currentTime === this.lastVideoTime) {
      return this.lastResult;
    }
    this.lastVideoTime = video.currentTime;

    const result = this.landmarker.detectForVideo(video, timestampMs);
    const hand = result.landmarks?.[0];
    const tip = hand?.[MediaPipeConfig.indexFingerTipLandmark];
    const base = hand?.[MediaPipeConfig.indexFingerBaseLandmark];
    if (!hand || !tip || !base) {
      this.lastResult = { state: TrackingState.Lost, position: null };
      return this.lastResult;
    }

    // カメラは鏡像表示するため x を反転する。
    const tipX = 1 - tip.x;
    const tipY = tip.y;
    const baseX = 1 - base.x;
    const baseY = base.y;

    // レーザーポインター方式: 手首→指先の向きを指先から延長し、
    // さらに画面中心まわりを増幅して端まで届くようにする。
    const dirX = tipX - baseX;
    const dirY = tipY - baseY;
    const k = PointingConfig.extension;
    const g = PointingConfig.gain;
    const px = tipX + dirX * k;
    const py = tipY + dirY * k;
    const position: Vec2 = {
      x: clamp01(0.5 + (px - 0.5) * g),
      y: clamp01(0.5 + (py - 0.5) * g),
    };
    this.lastResult = { state: TrackingState.Tracking, position };
    return this.lastResult;
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
