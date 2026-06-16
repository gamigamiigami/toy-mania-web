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

    // 手首→指先の3Dベクトル。z は奥行き(MediaPipe: 負ほどカメラに近い)。
    // カメラは鏡像表示するため x を反転する。
    const dx = (1 - tip.x) - (1 - base.x); // = base.x - tip.x → 右が正
    const dy = tip.y - base.y;
    const dz = tip.z - base.z;
    // カメラ(画面)へ向かう量。指先がカメラに近い(tz<bz)ほど大きい。
    const toward = Math.max(0.02, -dz);

    // 指している水平/垂直の角度 (奥行きを使うのがミソ。右を指す=横ではなく
    // 奥行き方向に回るので、z を見ないと角度が出ない)。
    const angX = Math.atan2(dx, toward); // 右が正(rad)
    const angY = Math.atan2(dy, toward); // 下が正(rad)

    const range = (PointingConfig.maxAngleDeg * Math.PI) / 180;
    const nX = (PointingConfig.neutralXDeg * Math.PI) / 180;
    const nY = (PointingConfig.neutralYDeg * Math.PI) / 180;
    const position: Vec2 = {
      x: clamp01(0.5 + (angX - nX) / (2 * range)),
      y: clamp01(0.5 + (angY - nY) / (2 * range)),
    };
    this.lastResult = { state: TrackingState.Tracking, position };
    return this.lastResult;
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
