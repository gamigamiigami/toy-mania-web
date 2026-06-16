import {
  CursorConfig,
  FeedbackConfig,
  ProjectileConfig,
  TargetConfig,
} from '../config/GameConfig';
import { TargetState, TrackingState } from '../core/types';
import type { CursorController } from '../cursor/CursorController';
import type { FeedbackManager } from '../feedback/FeedbackManager';
import type { TargetManager } from '../target/TargetManager';
import type { ProjectileSystem } from '../weapon/ProjectileSystem';

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
    projectiles: ProjectileSystem,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawVideoMirrored();
    this.drawTargets(targets);
    this.drawProjectiles(projectiles);
    this.drawMarkers(feedback);
    this.drawAimGuide(cursor, projectiles);
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

  /** 弾とその軌跡 (Trail) を描画する。外した方向が線で残る。 */
  private drawProjectiles(projectiles: ProjectileSystem): void {
    const { ctx } = this;
    for (const p of projectiles.getProjectiles()) {
      // Trail: 古い点ほど細く・薄く (幅 50% → 0% テーパー)。
      const pts = p.trail;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const ratio = i / pts.length; // 新しいほど 1 に近い
        ctx.save();
        ctx.globalAlpha = ratio * 0.8;
        ctx.strokeStyle = ProjectileConfig.color;
        ctx.lineWidth = p.radius * ratio; // テーパー
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.pos.x, a.pos.y);
        ctx.lineTo(b.pos.x, b.pos.y);
        ctx.stroke();
        ctx.restore();
      }
      // 弾本体
      ctx.save();
      ctx.fillStyle = ProjectileConfig.color;
      ctx.shadowColor = ProjectileConfig.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMarkers(feedback: FeedbackManager): void {
    const { ctx } = this;
    for (const m of feedback.getMarkers()) {
      if (m.kind !== 'hit') continue;
      const alpha = Math.max(0, m.life / m.maxLife);
      // Hit: 拡がるリング
      const r = 20 + (1 - alpha) * 40;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = FeedbackConfig.hitMarkerColor;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(m.position.x, m.position.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** 銃口から照準点へ向かう破線。狙っている「方向」を示す (着弾点ではない)。 */
  private drawAimGuide(
    cursor: CursorController,
    projectiles: ProjectileSystem,
  ): void {
    if (cursor.getState() !== TrackingState.Tracking) return;
    const { ctx } = this;
    const muzzle = projectiles.getMuzzle();
    const aim = cursor.getPosition();
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = CursorConfig.colorTracking;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(muzzle.x, muzzle.y);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
    ctx.restore();
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
