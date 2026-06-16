import { FeedbackConfig } from '../config/GameConfig';
import type { Vec2 } from '../core/types';

/** 命中リングマーカー。 */
export interface HitMarker {
  position: Vec2;
  life: number;
  maxLife: number;
}

/** フローティングスコア表示。 */
export interface ScoreText {
  position: Vec2;
  life: number;
  maxLife: number;
  text: string;
  big: boolean;
}

/**
 * FeedbackManager
 * 責務: 命中マーカーとフローティングスコアの保持・更新。
 *       「命中時に必ず スコア表示 + 命中マーカー」を担保する。
 */
export class FeedbackManager {
  private markers: HitMarker[] = [];
  private scores: ScoreText[] = [];

  /** 命中フィードバック (マーカー + スコア) をまとめて追加。 */
  addHit(position: Vec2, score: number): void {
    this.markers.push({
      position: { ...position },
      life: FeedbackConfig.hitMarkerLifeSec,
      maxLife: FeedbackConfig.hitMarkerLifeSec,
    });
    if (score > 0) {
      this.scores.push({
        position: { ...position },
        life: FeedbackConfig.scoreTextLifeSec,
        maxLife: FeedbackConfig.scoreTextLifeSec,
        text: `+${score}`,
        big: score >= FeedbackConfig.bigScoreThreshold,
      });
    }
  }

  update(dt: number): void {
    for (const m of this.markers) m.life -= dt;
    for (const s of this.scores) s.life -= dt;
    this.markers = this.markers.filter((m) => m.life > 0);
    this.scores = this.scores.filter((s) => s.life > 0);
  }

  getMarkers(): readonly HitMarker[] {
    return this.markers;
  }

  getScoreTexts(): readonly ScoreText[] {
    return this.scores;
  }
}
