/**
 * OneEuroFilter
 * 責務: ノイズの多い入力(MediaPipeの指先座標)を、静止時は強く平滑化し
 *       素早い動きには遅延なく追従させる適応フィルタ。
 *       カーソルの「止めてるのにプルプル」を抑える。
 * 参考: Casiez et al. "1€ Filter"。
 */
function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private xHat: number | null = null;
  private dxHat = 0;
  private xPrev: number | null = null;

  constructor(
    private minCutoff: number,
    private beta: number,
    private dCutoff: number,
  ) {}

  filter(x: number, dt: number): number {
    if (dt <= 0) dt = 1 / 60;
    if (this.xPrev === null) {
      this.xPrev = x;
      this.xHat = x;
      return x;
    }
    const dx = (x - this.xPrev) / dt;
    const aD = alpha(this.dCutoff, dt);
    this.dxHat = aD * dx + (1 - aD) * this.dxHat;
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dxHat);
    const a = alpha(cutoff, dt);
    this.xHat = a * x + (1 - a) * (this.xHat as number);
    this.xPrev = x;
    return this.xHat;
  }

  reset(): void {
    this.xHat = null;
    this.dxHat = 0;
    this.xPrev = null;
  }
}
