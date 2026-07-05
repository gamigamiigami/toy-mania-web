import { CursorConfig, FeedbackConfig } from '../config/GameConfig';
import type { Camera } from '../core/Camera';
import type { Player } from '../core/Player';
import { TrackingState } from '../core/types';
import type { CursorController } from '../cursor/CursorController';
import type { FeedbackManager } from '../feedback/FeedbackManager';
import type { ProjectileSystem } from '../weapon/ProjectileSystem';

/**
 * OverlayRenderer
 * 責務: WebGL キャンバスの上に重ねる 2D HUD の描画。
 *       照準カーソル / 弾道トレイル / 命中マーカー / フローティングスコア / 破片。
 *       3D→スクリーン変換は論理 Camera (three と同一パラメータ) を使う。
 */
export class OverlayRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context を取得できません');
    this.ctx = ctx;
  }

  render(
    players: Player[],
    feedback: FeedbackManager,
    projectiles: ProjectileSystem,
    camera: Camera,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawTrails(projectiles, camera);
    this.drawDebris(feedback);
    this.drawScoreTexts(feedback);
    this.drawMarkers(feedback);
    for (const p of players) {
      if (p.connected) this.drawCursor(p.cursor, p.color);
    }
  }

  /** 弾道トレイル: 外した方向の手掛かり (Aim→Shot→着弾→修正のループ)。 */
  private drawTrails(projectiles: ProjectileSystem, camera: Camera): void {
    const { ctx } = this;
    for (const proj of projectiles.getProjectiles()) {
      const pts = proj.trail;
      for (let i = 1; i < pts.length; i++) {
        const a = camera.project(pts[i - 1].pos);
        const b = camera.project(pts[i].pos);
        if (!a.visible || !b.visible) continue;
        const ratio = i / pts.length;
        ctx.save();
        ctx.globalAlpha = ratio * 0.5;
        ctx.strokeStyle = proj.color;
        ctx.lineWidth = Math.max(1, proj.radius * b.scale * ratio * 0.7);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawDebris(feedback: FeedbackManager): void {
    const { ctx } = this;
    for (const d of feedback.getDebris()) {
      const alpha = Math.max(0, d.life / d.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.position.x, d.position.y, d.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMarkers(feedback: FeedbackManager): void {
    const { ctx } = this;
    for (const m of feedback.getMarkers()) {
      const alpha = Math.max(0, m.life / m.maxLife);
      const r = 18 + (1 - alpha) * 36;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(m.position.x, m.position.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawScoreTexts(feedback: FeedbackManager): void {
    const { ctx } = this;
    for (const s of feedback.getScoreTexts()) {
      const t = 1 - s.life / s.maxLife; // 0→1
      const y = s.position.y - t * FeedbackConfig.scoreFloatPx;
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.font = `bold ${s.big ? 40 : 26}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText(s.text, s.position.x, y);
      ctx.restore();
    }
  }

  private drawCursor(cursor: CursorController, playerColor: string): void {
    const { ctx } = this;
    const p = cursor.getPosition();
    const tracking = cursor.getState() === TrackingState.Tracking;
    // 追跡中はプレイヤー色、Lost時は赤。
    const color = tracking ? playerColor : CursorConfig.colorLost;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = CursorConfig.lineWidth;
    ctx.beginPath();
    ctx.arc(p.x, p.y, CursorConfig.radius, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
