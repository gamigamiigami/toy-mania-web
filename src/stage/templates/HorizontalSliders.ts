import { ArenaConfig, TemplatesConfig } from '../../config/GameConfig';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';

interface LaneRuntime {
  laneIndex: number;
}

/**
 * HorizontalSliders (Template1)
 * 責務: 奥行きの異なる3レーンで的を左右に移動させる。
 *       距離感と横移動への偏差射撃を検証する。
 *       各レーンは z(奥) と y(高さ) が異なり平面配置を避ける。
 */
export class HorizontalSliders implements StageTemplate {
  readonly displayName = 'Horizontal Sliders';
  private targets: Target[] = [];
  /** どの的がどのレーン由来かを覚え、消滅後に同レーンへ再出現させる。 */
  private laneOf = new Map<Target, LaneRuntime>();
  private pending: { laneIndex: number; timer: number }[] = [];

  constructor() {
    TemplatesConfig.sliders.lanes.forEach((lane, laneIndex) => {
      for (let i = 0; i < lane.count; i++) this.spawn(laneIndex);
    });
  }

  private spawn(laneIndex: number): void {
    const lane = TemplatesConfig.sliders.lanes[laneIndex];
    const hw = ArenaConfig.halfWidth;
    const t = new Target({
      position: { x: (Math.random() * 2 - 1) * hw, y: lane.y, z: lane.z },
      type: lane.type,
    });
    // ランダムな向きへ動かす。
    t.vx = lane.speed * (Math.random() < 0.5 ? -1 : 1);
    this.targets.push(t);
    this.laneOf.set(t, { laneIndex });
  }

  update(dt: number): void {
    const hw = ArenaConfig.halfWidth;
    for (const t of this.targets) {
      t.update(dt);
      // 横移動 + 端で折返し。
      t.position.x += t.vx * dt;
      if (t.position.x > hw) {
        t.position.x = hw;
        t.vx = -Math.abs(t.vx);
      } else if (t.position.x < -hw) {
        t.position.x = -hw;
        t.vx = Math.abs(t.vx);
      }
    }

    // 破壊された的は同レーンへ再出現予約。
    const alive: Target[] = [];
    for (const t of this.targets) {
      if (t.isDestroyed()) {
        const rt = this.laneOf.get(t);
        if (rt) {
          this.pending.push({
            laneIndex: rt.laneIndex,
            timer: TemplatesConfig.sliders.respawnDelaySec,
          });
        }
        this.laneOf.delete(t);
      } else {
        alive.push(t);
      }
    }
    this.targets = alive;

    for (const p of this.pending) p.timer -= dt;
    this.pending = this.pending.filter((p) => {
      if (p.timer <= 0) {
        this.spawn(p.laneIndex);
        return false;
      }
      return true;
    });
  }

  getTargets(): Target[] {
    return this.targets;
  }

  onHit(target: Target): number {
    return target.scoreValue;
  }

  getGuides(): GuideSegment[] {
    const hw = ArenaConfig.halfWidth;
    // 各レーンの移動ラインを描く。
    return TemplatesConfig.sliders.lanes.map((lane) => ({
      a: { x: -hw, y: lane.y, z: lane.z },
      b: { x: hw, y: lane.y, z: lane.z },
    }));
  }
}
