import { ArenaConfig, StagesConfig } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { StageTemplate } from '../StageTemplate';
import { RespawnQueue, StageEventQueue, tierType } from './util';

const P = StagesConfig.plates;

/**
 * PlateCamp (皿割りキャンプ)
 * 速いボールで皿を撃ち抜くシーン。
 * - 棚: 固定の皿 (奥の段ほど小さく高得点)
 * - コンベア: 横に流れる皿
 * - 皿を連続で割ると「皿の山」(2000点) が出現する
 */
export class PlateCamp implements StageTemplate {
  readonly displayName = '皿割りキャンプ';
  readonly sceneId = 'plates' as const;
  readonly weapon = Weapons.ball;

  private shelfSlots: (Target | null)[][] = [];
  private shelfRespawn: RespawnQueue[][] = [];
  private conveyor: Target[] = [];
  private stack: Target | null = null;
  private breakCount = 0;
  private events = new StageEventQueue();

  constructor() {
    this.shelfSlots = P.shelves.map((shelf) =>
      shelf.xs.map((x) => this.makePlate(x, shelf)),
    );
    this.shelfRespawn = P.shelves.map((shelf) =>
      shelf.xs.map(() => new RespawnQueue()),
    );
    for (let i = 0; i < P.conveyor.count; i++) {
      this.conveyor.push(this.makeConveyorPlate(true));
    }
  }

  private makePlate(x: number, shelf: (typeof P.shelves)[number]): Target {
    return new Target({
      position: { x, y: shelf.y, z: shelf.z },
      radius: shelf.radius,
      scoreValue: shelf.score,
      type: tierType(shelf.score),
      style: 'plate',
    });
  }

  /** コンベアの皿。initial=true なら画面内のランダム位置から。 */
  private makeConveyorPlate(initial = false): Target {
    const C = P.conveyor;
    const hw = ArenaConfig.halfWidth;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const t = new Target({
      position: {
        x: initial ? (Math.random() * 2 - 1) * hw : -dir * (hw + 0.5),
        y: C.y,
        z: C.z,
      },
      radius: C.radius,
      scoreValue: C.score,
      type: tierType(C.score),
      style: 'plate',
    });
    t.vx = C.speed * dir;
    return t;
  }

  private spawnStack(): void {
    this.stack = new Target({
      position: { ...P.stack.position },
      radius: P.stack.radius,
      scoreValue: P.stack.score,
      type: TargetType.Bonus,
      style: 'stack',
      life: P.stack.lifeSec,
    });
    this.events.push('stack');
  }

  update(dt: number): void {
    // 棚の皿: 割れたらそのスロットに再出現を予約。
    this.shelfSlots.forEach((row, si) => {
      row.forEach((t, xi) => {
        if (t) {
          t.update(dt);
          if (t.isDestroyed()) {
            row[xi] = null;
            this.shelfRespawn[si][xi].schedule(P.shelfRespawnSec);
          }
        }
        this.shelfRespawn[si][xi].update(dt, () => {
          row[xi] = this.makePlate(P.shelves[si].xs[xi], P.shelves[si]);
        });
      });
    });

    // コンベア: 横に流れ、画面外に出たら反対側から次の皿。
    const hw = ArenaConfig.halfWidth;
    for (const t of this.conveyor) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (Math.abs(t.position.x) > hw + 1) t.expire();
    }
    this.conveyor = this.conveyor.filter((t) => !t.isDestroyed());
    while (this.conveyor.length < P.conveyor.count) {
      this.conveyor.push(this.makeConveyorPlate());
    }

    // 皿の山: 出現時間で消える。
    if (this.stack) {
      this.stack.update(dt);
      if (this.stack.isIdle()) {
        this.stack.life -= dt;
        if (this.stack.life <= 0) this.stack.expire();
      }
      if (this.stack.isDestroyed()) this.stack = null;
    }
  }

  getTargets(): Target[] {
    const out: Target[] = [];
    for (const row of this.shelfSlots) {
      for (const t of row) if (t && !t.isDestroyed()) out.push(t);
    }
    out.push(...this.conveyor.filter((t) => !t.isDestroyed()));
    if (this.stack && !this.stack.isDestroyed()) out.push(this.stack);
    return out;
  }

  onHit(t: Target): number {
    if (t !== this.stack) {
      // 皿を割った枚数を数え、規定枚数ごとに皿の山を出す (連鎖の報酬)。
      this.breakCount += 1;
      if (this.breakCount % P.stack.streak === 0 && !this.stack) {
        this.spawnStack();
      }
    }
    return t.scoreValue;
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
