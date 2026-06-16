import { TemplatesConfig } from '../../config/GameConfig';
import type { GameBus } from '../../core/EventBus';
import { TargetType, type Vec3 } from '../../core/types';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';

/**
 * PopupMatrix (Template2)
 * 責務: 3×3 の穴からランダムに的を出現させ、一定時間で消す。
 *       視線誘導と瞬間判断を検証する。
 *       行ごとに z(奥) と y(高さ) を変えて平面配置を避ける。
 *       Trigger を撃つと Bonus が解放される (撃つと何かが起きる)。
 */
export class PopupMatrix implements StageTemplate {
  readonly displayName = 'Pop-up Matrix';
  private readonly holes: Vec3[] = [];
  private targets: Target[] = [];
  private holeOf = new Map<Target, number>();
  private occupied = new Set<number>();
  private pending: { timer: number }[] = [];

  constructor(private readonly bus: GameBus) {
    const cfg = TemplatesConfig.matrix;
    for (let r = 0; r < cfg.rowZ.length; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const x = (c - (cfg.cols - 1) / 2) * cfg.xSpacing;
        this.holes.push({ x, y: cfg.rowY[r], z: cfg.rowZ[r] });
      }
    }
    for (let i = 0; i < cfg.activeCount; i++) this.spawn();
  }

  private freeHole(): number {
    const free: number[] = [];
    this.holes.forEach((_, i) => {
      if (!this.occupied.has(i)) free.push(i);
    });
    if (free.length === 0) return -1;
    return free[Math.floor(Math.random() * free.length)];
  }

  private pickType(): TargetType {
    const cfg = TemplatesConfig.matrix;
    const r = Math.random();
    if (r < cfg.triggerChance) return TargetType.Trigger;
    if (r < cfg.triggerChance + cfg.highValueChance) return TargetType.HighValue;
    return TargetType.Normal;
  }

  private spawn(): void {
    const hole = this.freeHole();
    if (hole < 0) return;
    const cfg = TemplatesConfig.matrix;
    const life = cfg.lifeMin + Math.random() * (cfg.lifeMax - cfg.lifeMin);
    const t = new Target({
      position: { ...this.holes[hole] },
      type: this.pickType(),
      life,
    });
    this.occupied.add(hole);
    this.holeOf.set(t, hole);
    this.targets.push(t);
  }

  /** 指定位置に Bonus を出す (Trigger 命中で解放)。 */
  private spawnBonus(): void {
    const hole = this.freeHole();
    const pos = hole >= 0 ? { ...this.holes[hole] } : { x: 0, y: 1, z: 6 };
    const t = new Target({
      position: pos,
      type: TargetType.Bonus,
      life: TemplatesConfig.matrix.bonusLifeSec,
    });
    if (hole >= 0) {
      this.occupied.add(hole);
      this.holeOf.set(t, hole);
    }
    this.targets.push(t);
    this.bus.emit('bonusSpawned', {});
    this.bus.emit('status', { text: 'BONUS!' });
  }

  update(dt: number): void {
    for (const t of this.targets) {
      t.update(dt);
      // 寿命切れで消滅 (まだ Idle のもの)。
      if (t.isIdle()) {
        t.life -= dt;
        if (t.life <= 0) t.expire();
      }
    }

    // 破壊された的の穴を解放し、再出現を予約。
    const alive: Target[] = [];
    for (const t of this.targets) {
      if (t.isDestroyed()) {
        const hole = this.holeOf.get(t);
        if (hole !== undefined) this.occupied.delete(hole);
        this.holeOf.delete(t);
        if (t.type !== TargetType.Bonus) {
          this.pending.push({ timer: TemplatesConfig.matrix.respawnDelaySec });
        }
      } else {
        alive.push(t);
      }
    }
    this.targets = alive;

    for (const p of this.pending) p.timer -= dt;
    this.pending = this.pending.filter((p) => {
      if (p.timer <= 0) {
        this.spawn();
        return false;
      }
      return true;
    });
  }

  getTargets(): Target[] {
    return this.targets;
  }

  onHit(target: Target): number {
    if (target.type === TargetType.Trigger) {
      this.spawnBonus();
    }
    return target.scoreValue;
  }

  getGuides(): GuideSegment[] {
    // 各穴を小さな十字で示す (出現位置の手掛かり)。
    const s = 0.25;
    const guides: GuideSegment[] = [];
    for (const h of this.holes) {
      guides.push({
        a: { x: h.x - s, y: h.y, z: h.z },
        b: { x: h.x + s, y: h.y, z: h.z },
      });
      guides.push({
        a: { x: h.x, y: h.y - s, z: h.z },
        b: { x: h.x, y: h.y + s, z: h.z },
      });
    }
    return guides;
  }
}
