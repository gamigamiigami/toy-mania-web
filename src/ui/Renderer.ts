import {
  CursorConfig,
  FeedbackConfig,
  TargetConfig,
} from '../config/GameConfig';
import { TargetState, TrackingState } from '../core/types';
import type { CursorController } from '../cursor/CursorController';
import type { FeedbackManager } from '../feedback/FeedbackManager';
import type { TargetManager } from '../target/TargetManager';

/**
 * Renderer
 * 責務: ゲーム状態を Canvas へ描画する (HTML5 Canvas)。
 *       状態を持たず、与えられたモジュールを読み取って描くだけ。
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context を取得できません');
    this.ctx = ctx;
  }

  render(
    targets: TargetManager,
    cursor: CursorController,
    feedback: FeedbackManager,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawVideoMirrored();
    this.drawTargets(targets);
    this.drawMarkers(feedback);
    this.drawCursor(cursor);
  }

  /** カメラ映像を鏡像で背景に描画する。 */
  private drawVideoMirrored(): void {
    const { ctx, canvas, video } = this;
    if (video.readyState < 2) return;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  private drawTargets(targets: TargetManager): void {
    const { ctx } = this;
    for (const t of targets.getTargets()) {
      const isHit = t.state === TargetState.Hit;
      ctx.beginPath();
      ctx.arc(t.position.x, t.position.y, t.radius, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? TargetConfig.colorHit : TargetConfig.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
    }
  }

  private drawMarkers(feedback: FeedbackManager): void {
    const { ctx, canvas } = this;
    for (const m of feedback.getMarkers()) {
      const alpha = Math.max(0, m.life / m.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (m.kind === 'shot') {
        // レーザーの曳光線: 画面下の銃口から着弾点へ。
        const mx = FeedbackConfig.muzzleX * canvas.width;
        const my = FeedbackConfig.muzzleY * canvas.height;
        ctx.strokeStyle = FeedbackConfig.shotColor;
        ctx.lineWidth = FeedbackConfig.shotWidth;
        ctx.shadowColor = FeedbackConfig.shotColor;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(m.position.x, m.position.y);
        ctx.stroke();
        // 着弾点の小さな閃光
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.position.x, m.position.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.kind === 'miss') {
        // Miss: X マーカー (着弾点)
        const r = FeedbackConfig.missMarkerRadius;
        ctx.strokeStyle = FeedbackConfig.missMarkerColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(m.position.x - r, m.position.y - r);
        ctx.lineTo(m.position.x + r, m.position.y + r);
        ctx.moveTo(m.position.x + r, m.position.y - r);
        ctx.lineTo(m.position.x - r, m.position.y + r);
        ctx.stroke();
      } else {
        // Hit: 拡がるリング
        const r = 20 + (1 - alpha) * 40;
        ctx.strokeStyle = FeedbackConfig.hitMarkerColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(m.position.x, m.position.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCursor(cursor: CursorController): void {
    const { ctx } = this;
    const p = cursor.getPosition();
    const tracking = cursor.getState() === TrackingState.Tracking;
    const color = tracking
      ? CursorConfig.colorTracking
      : CursorConfig.colorLost;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = CursorConfig.lineWidth;
    // リング
    ctx.beginPath();
    ctx.arc(p.x, p.y, CursorConfig.radius, 0, Math.PI * 2);
    ctx.stroke();
    // 十字
    const c = CursorConfig.radius + 8;
    ctx.beginPath();
    ctx.moveTo(p.x - c, p.y);
    ctx.lineTo(p.x - 6, p.y);
    ctx.moveTo(p.x + 6, p.y);
    ctx.lineTo(p.x + c, p.y);
    ctx.moveTo(p.x, p.y - c);
    ctx.lineTo(p.x, p.y - 6);
    ctx.moveTo(p.x, p.y + 6);
    ctx.lineTo(p.x, p.y + c);
    ctx.stroke();
    // 中心点
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
