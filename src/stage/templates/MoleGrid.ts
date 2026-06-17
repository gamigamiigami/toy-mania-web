import { StagesConfig } from '../../config/GameConfig';
import { Target } from '../../target/Target';
import type { GuideSegment, StageTemplate } from '../StageTemplate';
import { randIcon, tierType } from './util';

const M = StagesConfig.mole;

interface Mole {
  target: Target;
  col: number;
  row: number;
  state: 'rise' | 'hold' | 'sink';
  t: number;
}

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, p));
}

/**
 * MoleGrid (立体モグラ叩き)
 * 奥行き3段の穴から的が上下に出没。出ている間に当てる。奥ほど高得点。
 */
export class MoleGrid implements StageTemplate {
  readonly displayName = '立体モグラ叩き';
  readonly backgroundKey = 'farm';

  private moles: Mole[] = [];
  private occupied = new Set<string>();
  private pending: number[] = [];

  constructor() {
    for (let i = 0; i < M.active; i++) this.spawn();
  }

  private key(c: number, r: number): string {
    return `${c},${r}`;
  }

  private spawn(): void {
    const free: [number, number][] = [];
    for (let c = 0; c < M.cols.length; c++)
      for (let r = 0; r < M.rows.length; r++)
        if (!this.occupied.has(this.key(c, r))) free.push([c, r]);
    if (free.length === 0) return;
    const [c, r] = free[Math.floor(Math.random() * free.length)];
    const row = M.rows[r];
    const t = new Target({
      position: { x: M.cols[c], y: row.yDown, z: row.z },
      radius: M.tr,
      scoreValue: row.score,
      type: tierType(row.score),
      iconIndex: randIcon(),
    });
    this.occupied.add(this.key(c, r));
    this.moles.push({ target: t, col: c, row: r, state: 'rise', t: 0 });
  }

  update(dt: number): void {
    for (const m of this.moles) {
      m.target.update(dt);
      if (m.target.isDestroyed()) continue;
      const row = M.rows[m.row];
      m.t += dt;
      if (m.state === 'rise') {
        m.target.position.y = lerp(row.yDown, row.yUp, m.t / M.riseSec);
        if (m.t >= M.riseSec) { m.state = 'hold'; m.t = 0; }
      } else if (m.state === 'hold') {
        m.target.position.y = row.yUp;
        if (m.t >= M.holdSec) { m.state = 'sink'; m.t = 0; }
      } else {
        m.target.position.y = lerp(row.yUp, row.yDown, m.t / M.sinkSec);
        if (m.t >= M.sinkSec) m.target.expire();
      }
    }
    // 退場したモグラの穴を解放し、再出現を予約。
    const alive: Mole[] = [];
    for (const m of this.moles) {
      if (m.target.isDestroyed()) {
        this.occupied.delete(this.key(m.col, m.row));
        this.pending.push(M.gapSec);
      } else alive.push(m);
    }
    this.moles = alive;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      this.pending[i] -= dt;
      if (this.pending[i] <= 0 && this.moles.length < M.active) {
        this.pending.splice(i, 1);
        this.spawn();
      }
    }
  }

  getTargets(): Target[] {
    return this.moles.map((m) => m.target).filter((t) => !t.isDestroyed());
  }
  onHit(t: Target): number { return t.scoreValue; }
  getGuides(): GuideSegment[] { return []; }
}
