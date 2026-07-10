import { StagesConfig } from '../../config/GameConfig';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { randIcon, tierType } from './util';

const P = StagesConfig.practice;

/**
 * Practice (練習ラウンド)
 * 本家の出発直後のパイ投げ練習。大きな静止的だけを並べ、操作に慣れてもらう。
 * ここでの得点はライド本番に持ち越されない (GameEngine がリセットする)。
 */
export class Practice implements StageTemplate {
  readonly displayName = 'れんしゅう';
  readonly backgroundKey = 'farm';

  private slots: { target: Target | null; timer: number; index: number }[];

  constructor() {
    this.slots = P.slots.map((_, index) => ({
      target: this.make(index),
      timer: 0,
      index,
    }));
  }

  private make(index: number): Target {
    const s = P.slots[index];
    return new Target({
      position: { x: s.x, y: s.y, z: s.z },
      radius: P.tr,
      scoreValue: P.score,
      type: tierType(P.score),
      iconIndex: randIcon(),
    });
  }

  update(dt: number): void {
    for (const slot of this.slots) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isDestroyed()) { slot.target = null; slot.timer = P.respawn; }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) slot.target = this.make(slot.index);
      }
    }
  }

  getTargets(): Target[] {
    return this.slots
      .map((s) => s.target)
      .filter((t): t is Target => t !== null && !t.isDestroyed());
  }

  onHit(t: Target): number {
    return t.scoreValue;
  }

  getGuides(): GuideSegment[] {
    return [];
  }
}
