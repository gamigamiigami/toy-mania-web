import type { StageEventKind } from './types';
import type { WeaponKind } from '../weapon/WeaponSpec';

/**
 * Sound
 * 責務: WebAudio による簡易効果音 (素材不要)。武器別の発射音 / 命中 /
 *       ステージイベント (扉・噴火・ロケット等) / ファンファーレ。
 *       AudioContext はユーザー操作(スタート)時に init() で起動/再開する。
 */
export class Sound {
  private ctx: AudioContext | null = null;

  init(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      try {
        this.ctx = new Ctor();
      } catch {
        this.ctx = null;
      }
    }
    void this.ctx?.resume?.();
  }

  private blip(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    gain = 0.07,
    slideTo?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const now = ctx.currentTime;
    if (slideTo !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
    }
    o.connect(g).connect(ctx.destination);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur);
  }

  /** 武器ごとに発射音の性格を変える。 */
  fire(kind: WeaponKind): void {
    switch (kind) {
      case 'pie':
        this.blip(140, 0.1, 'sine', 0.05, 90);
        break;
      case 'egg':
        this.blip(220, 0.08, 'sine', 0.05, 320);
        break;
      case 'dart':
        this.blip(700, 0.06, 'sawtooth', 0.03, 1200);
        break;
      case 'ball':
        this.blip(160, 0.06, 'square', 0.05, 110);
        break;
      case 'ring':
        this.blip(500, 0.12, 'triangle', 0.04, 750);
        break;
      case 'suction':
        this.blip(420, 0.05, 'sawtooth', 0.035, 900);
        break;
    }
  }

  hit(score: number): void {
    const f = 480 + Math.min(900, score * 0.5);
    this.blip(f, 0.1, 'square', 0.08);
    this.blip(f * 1.5, 0.09, 'square', 0.04);
  }

  bonus(): void {
    [660, 880, 1320].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.12, 'triangle', 0.08), i * 70),
    );
  }

  /** ステージ内イベント音 (発見の報酬を耳でも伝える)。 */
  stageEvent(kind: StageEventKind): void {
    switch (kind) {
      case 'door':
        this.blip(200, 0.25, 'square', 0.06, 90); // 扉がきしむ
        setTimeout(() => this.bonus(), 200);
        break;
      case 'eruption':
        this.blip(70, 0.6, 'sawtooth', 0.1, 40); // 地響き
        setTimeout(() => this.bonus(), 300);
        break;
      case 'stack':
        this.bonus();
        break;
      case 'rocket':
        this.blip(120, 0.7, 'sawtooth', 0.08, 900); // 打ち上げ
        setTimeout(() => this.bonus(), 400);
        break;
      case 'bats':
        [900, 1100, 900, 1100].forEach((f, i) =>
          setTimeout(() => this.blip(f, 0.06, 'triangle', 0.05), i * 80),
        );
        break;
      case 'growFinish':
        this.fanfare();
        break;
    }
  }

  roundEnd(): void {
    [880, 660, 990, 1320].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.09), i * 120),
    );
  }

  /** 全シーン終了のファンファーレ。 */
  fanfare(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.22, 'triangle', 0.1), i * 130),
    );
  }
}
