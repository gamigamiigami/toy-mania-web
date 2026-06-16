import {
  FilesetResolver,
  HandLandmarker,
} from '@mediapipe/tasks-vision';
import { MediaPipeConfig } from '../config/GameConfig';
import { TrackingState, type PointerResult, type Vec2 } from '../core/types';

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
    if (!tip) {
      return { state: TrackingState.Lost, position: null };
    }

    // カメラは鏡像表示するため x を反転する。
    const position: Vec2 = { x: 1 - tip.x, y: tip.y };
    return { state: TrackingState.Tracking, position };
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
