import { StagesConfig } from '../../config/GameConfig';
import { TargetType, type StageEventKind } from '../../core/types';
import { Target } from '../../target/Target';
import { Weapons } from '../../weapon/WeaponSpec';
import type { SceneState, StageTemplate } from '../StageTemplate';
import { rand, StageEventQueue } from './util';

const B = StagesConfig.balloon;

/**
 * BalloonDarts (風船火山)
 * ダーツで風船を割るシーン。風船は下から湧いてゆらゆら上昇する。
 * 溶岩風船 (トリガー3個) を全部割ると火山が噴火し、
 * 高得点風船が火口から一斉に噴き出す。
 */
export class BalloonDarts implements StageTemplate {
  readonly displayName = '風船火山';
  readonly sceneId = 'balloon' as const;
  readonly weapon = Weapons.dart;

  private balloons: Target[] = [];
  private lava: Target[] = [];
  private eruptionBalloons: Target[] = [];
  /** 噴火演出の残り時間 (秒)。>0 の間シーンが光る。 */
  private eruptionT = 0;
  /** 溶岩風船の再配置タイマー。 */
  private lavaResetT = 0;
  private events = new StageEventQueue();

  constructor() {
    for (let i = 0; i < B.normal.active; i++) {
      // 初期配置は高さをばらして自然に。
      this.balloons.push(this.makeBalloon(rand(B.normal.spawnY, B.normal.topY * 0.7)));
    }
    this.placeLava();
  }

  private makeBalloon(y?: number): Target {
    const N = B.normal;
    const mid = Math.random() < N.midChance;
    const t = new Target({
      position: {
        x: rand(-N.xRange, N.xRange),
        y: y ?? N.spawnY,
        z: rand(N.zRange[0], N.zRange[1]),
      },
      radius: N.radius,
      scoreValue: mid ? 500 : 100,
      type: mid ? TargetType.HighValue : TargetType.Normal,
      style: 'balloon',
    });
    t.vx = rand(N.riseSpeed[0], N.riseSpeed[1]); // vx を上昇速度として使う
    t.phase = rand(0, Math.PI * 2);
    return t;
  }

  private placeLava(): void {
    this.lava = B.lava.positions.map(
      (pos) =>
        new Target({
          position: { ...pos },
          radius: B.lava.radius,
          scoreValue: B.lava.score,
          type: TargetType.Trigger,
          style: 'lava',
        }),
    );
  }

  private erupt(): void {
    const E = B.eruption;
    for (let i = 0; i < E.count; i++) {
      const t = new Target({
        position: {
          x: E.vent.x + rand(-E.spreadX, E.spreadX) * 0.3,
          y: E.vent.y,
          z: E.vent.z + rand(-0.5, 0.5),
        },
        radius: E.radius,
        scoreValue: E.score,
        type: TargetType.Bonus,
        style: 'balloon',
        life: E.lifeSec,
      });
      t.vx = rand(E.riseSpeed[0], E.riseSpeed[1]);
      t.phase = rand(0, Math.PI * 2);
      // 噴き出しの横速度は phase に応じて左右へ散らす。
      t.position.x = E.vent.x + Math.cos(t.phase) * rand(0, E.spreadX * 0.5);
      this.eruptionBalloons.push(t);
    }
    this.eruptionT = E.lifeSec;
    this.lavaResetT = B.lava.resetSec;
    this.events.push('eruption');
  }

  /** 風船共通の上昇＆ゆらぎ。 */
  private float(t: Target, dt: number): void {
    t.phase += B.normal.swaySpeed * dt;
    t.position.y += t.vx * dt;
    t.position.x += Math.cos(t.phase) * B.normal.swayAmp * dt;
  }

  update(dt: number): void {
    for (const t of this.balloons) {
      t.update(dt);
      this.float(t, dt);
      if (t.position.y > B.normal.topY) t.expire(); // 画面上に抜けたら消す
    }
    this.balloons = this.balloons.filter((t) => !t.isDestroyed());
    while (this.balloons.length < B.normal.active) {
      this.balloons.push(this.makeBalloon());
    }

    for (const t of this.lava) t.update(dt);
    const lavaAlive = this.lava.filter((t) => !t.isDestroyed());
    if (this.lava.length > 0 && lavaAlive.length === 0) {
      this.lava = [];
      this.erupt();
    } else {
      this.lava = lavaAlive;
    }
    // 噴火後、時間が経ったら溶岩風船を再配置 (もう一度狙える)。
    if (this.lava.length === 0 && this.lavaResetT > 0) {
      this.lavaResetT -= dt;
      if (this.lavaResetT <= 0) this.placeLava();
    }

    for (const t of this.eruptionBalloons) {
      t.update(dt);
      this.float(t, dt);
      if (t.isIdle()) {
        t.life -= dt;
        if (t.life <= 0) t.expire();
      }
    }
    this.eruptionBalloons = this.eruptionBalloons.filter((t) => !t.isDestroyed());

    if (this.eruptionT > 0) this.eruptionT -= dt;
  }

  getTargets(): Target[] {
    return [
      ...this.balloons.filter((t) => !t.isDestroyed()),
      ...this.lava.filter((t) => !t.isDestroyed()),
      ...this.eruptionBalloons.filter((t) => !t.isDestroyed()),
    ];
  }

  onHit(t: Target): number {
    return t.scoreValue;
  }

  getSceneState(): SceneState {
    return {
      eruption: Math.max(0, Math.min(1, this.eruptionT / B.eruption.lifeSec)),
    };
  }

  consumeEvents(): StageEventKind[] {
    return this.events.consume();
  }
}
