/**
 * Sound
 * 責務: WebAudio による簡易効果音 (素材不要)。発射/命中/ボーナス/ラウンド終了。
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
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur);
  }

  fire(): void {
    this.blip(180, 0.07, 'sawtooth', 0.04);
  }

  hit(score: number): void {
    const f = 480 + Math.min(900, score);
    this.blip(f, 0.1, 'square', 0.08);
    this.blip(f * 1.5, 0.09, 'square', 0.04);
  }

  bonus(): void {
    [660, 880, 1320].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.12, 'triangle', 0.08), i * 70),
    );
  }

  roundEnd(): void {
    [880, 660, 990, 1320].forEach((f, i) =>
      setTimeout(() => this.blip(f, 0.16, 'triangle', 0.09), i * 120),
    );
  }
}
