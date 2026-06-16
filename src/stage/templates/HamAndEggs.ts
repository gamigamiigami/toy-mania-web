import { ArenaConfig, TemplatesConfig } from '../../config/GameConfig';
import type { GameBus } from '../../core/EventBus';
import { TargetType } from '../../core/types';
import { Target } from '../../target/Target';
import type { SceneProp } from '../Scene';
import type { GuideSegment, StageTemplate } from '../StageTemplate';

interface PopSlot {
  spotIndex: number;
  target: Target | null;
  timer: number;
}

type DoorState = 'closed' | 'opening' | 'open' | 'closing';

const CFG = TemplatesConfig.hameggs;

/**
 * HamAndEggs (本戦1面の再現)
 * 責務: 牧場シーン(背景/建物)を提示し、ポップアップ/横移動/飛行の的を出し、
 *       屋根のキツネ(Trigger)を撃つと扉が開き鶏(1000点 Bonus)が飛び出す
 *       「発見」のギミックを駆動する。
 */
export class HamAndEggs implements StageTemplate {
  readonly displayName = 'Ham & Eggs';

  private weasels: PopSlot[] = [];
  private sliders: Target[] = [];
  private flyers: Target[] = [];
  private fox: Target | null = null;
  private chickens: Target[] = [];

  private doorState: DoorState = 'closed';
  private doorOpen = 0;
  private bonusTimer = 0;
  private time = 0;

  constructor(private readonly bus: GameBus) {
    this.weasels = CFG.weasels.spots.map((_, i) => ({
      spotIndex: i,
      target: null,
      timer: Math.random() * CFG.weasels.respawnSec,
    }));
    for (let i = 0; i < CFG.sliders.count; i++) {
      this.sliders.push(this.makeSlider(i / CFG.sliders.count));
    }
    for (let i = 0; i < CFG.flyers.count; i++) {
      this.flyers.push(this.makeFlyer(i / CFG.flyers.count));
    }
    this.fox = new Target({
      position: CFG.fox,
      type: TargetType.Trigger,
    });
    this.bus.emit('status', { text: '屋根のキツネを撃て' });
  }

  // --- 生成ヘルパー ---
  private makeSlider(t: number): Target {
    const hw = ArenaConfig.halfWidth + 1;
    const target = new Target({
      position: { x: -hw + t * 2 * hw, y: CFG.sliders.y, z: CFG.sliders.z },
      type: TargetType.Normal,
    });
    target.vx = CFG.sliders.speed;
    return target;
  }

  private makeFlyer(t: number): Target {
    const x = -CFG.flyers.xRange + t * 2 * CFG.flyers.xRange;
    const target = new Target({
      position: { x, y: CFG.flyers.baseY, z: CFG.flyers.z },
      type: TargetType.HighValue,
    });
    target.vx = CFG.flyers.speed;
    return target;
  }

  private spawnWeasel(slot: PopSlot): void {
    slot.target = new Target({
      position: { ...CFG.weasels.spots[slot.spotIndex] },
      type: TargetType.Normal,
      life: CFG.weasels.holdSec,
    });
  }

  private spawnChickens(): void {
    this.chickens = CFG.chickens.positions
      .slice(0, CFG.chickens.count)
      .map(
        (p) =>
          new Target({
            position: p,
            type: TargetType.Bonus,
            scoreValue: CFG.chickens.score,
          }),
      );
    this.bonusTimer = CFG.chickens.windowSec;
    this.bus.emit('bonusSpawned', {});
    this.bus.emit('status', { text: 'ニワトリ出現！1000点' });
  }

  // --- 更新 ---
  update(dt: number): void {
    this.time += dt;
    this.updateWeasels(dt);
    this.updateSliders(dt);
    this.updateFlyers(dt);
    this.fox?.update(dt);
    this.updateDoorAndChickens(dt);
  }

  private updateWeasels(dt: number): void {
    for (const slot of this.weasels) {
      if (slot.target) {
        slot.target.update(dt);
        if (slot.target.isIdle()) {
          slot.target.life -= dt;
          if (slot.target.life <= 0) slot.target.expire();
        }
        if (slot.target.isDestroyed()) {
          slot.target = null;
          slot.timer = CFG.weasels.respawnSec;
        }
      } else {
        slot.timer -= dt;
        if (slot.timer <= 0) this.spawnWeasel(slot);
      }
    }
  }

  private updateSliders(dt: number): void {
    const hw = ArenaConfig.halfWidth + 1;
    const alive: Target[] = [];
    for (const t of this.sliders) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (t.position.x > hw) t.position.x = -hw; // 右端→左端へループ
      if (t.isDestroyed()) {
        alive.push(this.makeSlider(Math.random()));
      } else {
        alive.push(t);
      }
    }
    this.sliders = alive;
  }

  private updateFlyers(dt: number): void {
    const r = CFG.flyers.xRange;
    const alive: Target[] = [];
    for (const t of this.flyers) {
      t.update(dt);
      t.position.x += t.vx * dt;
      if (t.position.x > r) t.position.x = -r;
      // サインカーブで上下に揺れる飛行。
      t.position.y = CFG.flyers.baseY + CFG.flyers.amp * Math.sin(t.position.x * 0.8);
      if (t.isDestroyed()) {
        alive.push(this.makeFlyer(Math.random()));
      } else {
        alive.push(t);
      }
    }
    this.flyers = alive;
  }

  private updateDoorAndChickens(dt: number): void {
    const step = dt / CFG.doorOpenSec;
    switch (this.doorState) {
      case 'opening':
        this.doorOpen = Math.min(1, this.doorOpen + step);
        if (this.doorOpen >= 1) {
          this.doorState = 'open';
          this.spawnChickens();
        }
        break;
      case 'open':
        for (const c of this.chickens) c.update(dt);
        this.chickens = this.chickens.filter((c) => !c.isDestroyed());
        this.bonusTimer -= dt;
        if (this.chickens.length === 0 || this.bonusTimer <= 0) {
          for (const c of this.chickens) c.expire();
          this.chickens = [];
          this.doorState = 'closing';
        }
        break;
      case 'closing':
        this.doorOpen = Math.max(0, this.doorOpen - step);
        if (this.doorOpen <= 0) {
          this.doorState = 'closed';
          // キツネを再配置して再挑戦可能にする。
          this.fox = new Target({ position: CFG.fox, type: TargetType.Trigger });
          this.bus.emit('status', { text: '屋根のキツネを撃て' });
        }
        break;
      case 'closed':
        break;
    }
  }

  // --- 取得 ---
  getTargets(): Target[] {
    const out: Target[] = [];
    for (const s of this.weasels) if (s.target && !s.target.isDestroyed()) out.push(s.target);
    for (const t of this.sliders) if (!t.isDestroyed()) out.push(t);
    for (const t of this.flyers) if (!t.isDestroyed()) out.push(t);
    if (this.fox && !this.fox.isDestroyed()) out.push(this.fox);
    for (const c of this.chickens) if (!c.isDestroyed()) out.push(c);
    return out;
  }

  onHit(target: Target): number {
    if (target === this.fox) {
      this.fox = null;
      this.doorState = 'opening';
      return target.scoreValue;
    }
    return target.scoreValue;
  }

  getGuides(): GuideSegment[] {
    return [];
  }

  getProps(): SceneProp[] {
    return [
      // 背景の丘 (一番奥)。
      { kind: 'hill', base: { x: -2, y: -4, z: 24 }, width: 18, height: 6, color: 'rgba(70,150,80,0.7)' },
      { kind: 'hill', base: { x: 5, y: -4, z: 23 }, width: 14, height: 5, color: 'rgba(90,170,95,0.7)' },
      // 池と風車 (右奥)。
      { kind: 'pond', base: { x: 3, y: -4, z: 18 }, width: 4, height: 1.4 },
      { kind: 'windmill', base: { x: 4.2, y: -4, z: 19 }, width: 1.2, height: 6, angle: this.time * CFG.windmillSpeed },
      // 中央の鶏小屋 (扉アニメ) とサイロ。
      { kind: 'barn', base: { x: 0, y: -4, z: 15 }, width: 6, height: 5, doorOpen: this.doorOpen },
      { kind: 'silo', base: { x: 3.4, y: -4, z: 15 }, width: 1.6, height: 6 },
      // 左のサボテン。
      { kind: 'cactus', base: { x: -3.6, y: -4, z: 12 }, width: 1, height: 2.4 },
      { kind: 'cactus', base: { x: -4.6, y: -4, z: 13 }, width: 0.8, height: 1.8 },
      // 手前の白い柵 (最前面・的の足元を隠す)。
      { kind: 'fence', base: { x: 0, y: -4, z: 10 }, width: 16, height: 1.4, foreground: true },
    ];
  }
}
