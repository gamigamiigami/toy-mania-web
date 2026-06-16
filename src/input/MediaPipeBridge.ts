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
      return { state: TrackingState.Lost, position: null };
    }

    // 同一フレームを二重処理しない
    if (video.currentTime === this.lastVideoTime) {
      return { state: TrackingState.Lost, position: null };
    }
    this.lastVideoTime = video.currentTime;

    const result = this.landmarker.detectForVideo(video, timestampMs);
    const hand = result.landmarks?.[0];
    if (!hand) {
      return { state: TrackingState.Lost, position: null };
    }

    const tip = hand[MediaPipeConfig.indexFingerTipLandmark];
    const base = hand[MediaPipeConfig.indexFingerBaseLandmark];
    if (!tip || !base) {
      return { state: TrackingState.Lost, position: null };
    }

    // カメラは鏡像表示するため x を反転する。
    const tipX = 1 - tip.x;
    const tipY = tip.y;
    const baseX = 1 - base.x;
    const baseY = base.y;

    // レーザーポインター方式: 付け根→指先の向きを指先からさらに延長した点を狙う。
    const dirX = tipX - baseX;
    const dirY = tipY - baseY;
    const k = PointingConfig.extension;
    const position: Vec2 = {
      x: clamp01(tipX + dirX * k),
      y: clamp01(tipY + dirY * k),
    };
    return { state: TrackingState.Tracking, position };
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
