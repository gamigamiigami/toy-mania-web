import { FeedbackConfig } from '../config/GameConfig';
import type { Vec2 } from '../core/types';

export type MarkerKind = 'hit' | 'miss' | 'shot';

export interface Marker {
  kind: MarkerKind;
  position: Vec2;
  /** 残り寿命 (秒) */
  life: number;
  /** 初期寿命 (フェード計算用) */
  maxLife: number;
}

/**
 * FeedbackManager
 * 責務: Hit / Miss の着弾マーカーを保持・更新する。
 *       プレイヤーが狙いを修正できる手掛かりを提供する。
 */
export class FeedbackManager {
  private markers: Marker[] = [];

  /** 発射のたびに呼ぶ。命中/外れに関わらず「撃った」見た目を出す。 */
  addShot(position: Vec2): void {
    this.markers.push({
      kind: 'shot',
      position: { ...position },
      life: FeedbackConfig.shotLifeSec,
      maxLife: FeedbackConfig.shotLifeSec,
    });
  }

  addHit(position: Vec2): void {
    this.markers.push({
      kind: 'hit',
      position: { ...position },
      life: FeedbackConfig.hitMarkerLifeSec,
      maxLife: FeedbackConfig.hitMarkerLifeSec,
    });
  }

  addMiss(position: Vec2): void {
    this.markers.push({
      kind: 'miss',
      position: { ...position },
      life: FeedbackConfig.missMarkerLifeSec,
      maxLife: FeedbackConfig.missMarkerLifeSec,
    });
  }

  update(dt: number): void {
    for (const m of this.markers) m.life -= dt;
    this.markers = this.markers.filter((m) => m.life > 0);
  }

  getMarkers(): readonly Marker[] {
    return this.markers;
  }
}
