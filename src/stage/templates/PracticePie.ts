import { StagesConfig } from '../../config/GameConfig';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { StageTemplate } from '../StageTemplate';
import { RespawnQueue } from './util';

const P = StagesConfig.practice;

/**
 * PracticePie (練習: パイなげ)
 * 静止した大きな的だけの腕慣らしシーン。照準→投擲→着弾のループを覚える。
 */
export class PracticePie implements StageTemplate {
  readonly displayName = '練習: パイなげ';
  readonly sceneId = 'practice' as const;
  readonly weapon = Weapons.pie;

  private slots: (Target | null)[];
  private respawn: RespawnQueue[] = [];

  constructor() {
    this.slots = P.slots.map((s) => this.make(s));
    this.respawn = P.slots.map(() => new RespawnQueue());
  }

  private make(pos: { x: number; y: number; z: number }): Target {
    return new Target({
      position: { ...pos },
      radius: P.radius,
      style: 'bullseye',
    });
  }

  update(dt: number): void {
    this.slots.forEach((t, i) => {
      if (t) {
        t.update(dt);
        if (t.isDestroyed()) {
          this.slots[i] = null;
          this.respawn[i].schedule(P.respawnSec);
        }
      }
      this.respawn[i].update(dt, () => {
        this.slots[i] = this.make(P.slots[i]);
      });
    });
  }

  getTargets(): Target[] {
    return this.slots.filter((t): t is Target => !!t && !t.isDestroyed());
  }

  onHit(t: Target): number {
    return t.scoreValue;
  }
}
