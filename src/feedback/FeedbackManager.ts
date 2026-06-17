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

/** 命中で割れた破片。 */
export interface Debris {
  position: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/**
 * FeedbackManager
 * 責務: 命中マーカーとフローティングスコアの保持・更新。
 *       「命中時に必ず スコア表示 + 命中マーカー」を担保する。
 */
export class FeedbackManager {
  private markers: HitMarker[] = [];
  private scores: ScoreText[] = [];
  private debris: Debris[] = [];

  /** 命中で的が割れる破片を生成する。 */
  addBreak(position: Vec2, radiusPx: number): void {
    const n = FeedbackConfig.debrisCount;
    const colors = FeedbackConfig.debrisColors;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const sp = FeedbackConfig.debrisSpeed * (0.5 + Math.random());
      this.debris.push({
        position: { ...position },
        vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
        life: FeedbackConfig.debrisLifeSec,
        maxLife: FeedbackConfig.debrisLifeSec,
        size: Math.max(3, radiusPx * 0.18) * (0.6 + Math.random() * 0.6),
        color: colors[i % colors.length],
      });
    }
  }

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
    for (const d of this.debris) {
      d.life -= dt;
      d.position.x += d.vel.x * dt;
      d.position.y += d.vel.y * dt;
      d.vel.y += FeedbackConfig.debrisGravity * dt; // 落下
    }
    this.markers = this.markers.filter((m) => m.life > 0);
    this.scores = this.scores.filter((s) => s.life > 0);
    this.debris = this.debris.filter((d) => d.life > 0);
  }

  getMarkers(): readonly HitMarker[] {
    return this.markers;
  }

  getScoreTexts(): readonly ScoreText[] {
    return this.scores;
  }

  getDebris(): readonly Debris[] {
    return this.debris;
  }
}
