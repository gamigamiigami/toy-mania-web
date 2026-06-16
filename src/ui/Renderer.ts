import {
  CursorConfig,
  FeedbackConfig,
  StageConfig,
  WorldConfig,
  TargetConfig,
} from '../config/GameConfig';
import type { Camera } from '../core/Camera';
import { TargetState, TrackingState, type Vec3 } from '../core/types';
import type { CursorController } from '../cursor/CursorController';
import type { FeedbackManager } from '../feedback/FeedbackManager';
import type { Stage } from '../stage/Stage';
import type { TargetManager } from '../target/TargetManager';
import type { ProjectileSystem } from '../weapon/ProjectileSystem';

/**
 * Renderer
 * 責務: 3Dワールドを Camera で透視投影し Canvas へ描画する。
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
    stage: Stage,
    targets: TargetManager,
    cursor: CursorController,
    feedback: FeedbackManager,
    projectiles: ProjectileSystem,
    camera: Camera,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    this.drawVideoMirrored();
    // 奥のものから描く (ペインターズアルゴリズム)。
    this.drawFloorGrid(camera);
    this.drawStage(stage, camera);
    this.drawTargets(targets, camera);
    this.drawProjectiles(projectiles, camera);
    this.drawMarkers(feedback);
    this.drawAimGuide(cursor);
    this.drawCursor(cursor);
  }

  /** 空〜地面のグラデーション背景。 */
  private drawBackground(): void {
    const { ctx, canvas } = this;
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0b1733');
    g.addColorStop(0.55, '#10243f');
    g.addColorStop(1, '#06101f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** カメラ映像を鏡像で薄く重ねる (AR感)。 */
  private drawVideoMirrored(): void {
    const { ctx, canvas, video } = this;
    if (video.readyState < 2) return;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.globalAlpha = 0.32;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /** 床のグリッド。奥行きの手掛かりを強める。 */
  private drawFloorGrid(camera: Camera): void {
    const { ctx } = this;
    const y = WorldConfig.floorY;
    const hw = StageConfig.halfWidth + 2;
    const zStart = StageConfig.z0 - 2;
    const zEnd =
      StageConfig.z0 + StageConfig.stepCount * StageConfig.stepDepth + 3;

    ctx.save();
    ctx.strokeStyle = StageConfig.gridColor;
    ctx.lineWidth = 1;
    // z方向の線 (奥行き)
    for (let x = -hw; x <= hw; x += 1.5) {
      this.strokeLine3D(camera, { x, y, z: zStart }, { x, y, z: zEnd });
    }
    // x方向の線 (横)
    for (let z = zStart; z <= zEnd; z += 1.5) {
      this.strokeLine3D(camera, { x: -hw, y, z }, { x: hw, y, z });
    }
    ctx.restore();
  }

  /** 階段ステージ (各段の上面と前面) を描画する。 */
  private drawStage(stage: Stage, camera: Camera): void {
    const hw = stage.halfWidth;
    // 奥の段から描く。
    const steps = [...stage.getSteps()].sort((a, b) => b.zFar - a.zFar);
    for (const s of steps) {
      // 前面(蹴上げ): 手前側の縦面。
      this.fillQuad3D(
        camera,
        [
          { x: -hw, y: s.y, z: s.zNear },
          { x: hw, y: s.y, z: s.zNear },
          { x: hw, y: s.yBottom, z: s.zNear },
          { x: -hw, y: s.yBottom, z: s.zNear },
        ],
        StageConfig.colorRiser,
      );
      // 上面: 水平面。
      this.fillQuad3D(
        camera,
        [
          { x: -hw, y: s.y, z: s.zFar },
          { x: hw, y: s.y, z: s.zFar },
          { x: hw, y: s.y, z: s.zNear },
          { x: -hw, y: s.y, z: s.zNear },
        ],
        StageConfig.colorTop,
        StageConfig.edgeColor,
      );
    }
  }

  /** 3Dの4頂点ポリゴンを投影して塗る。全頂点が前方にあるときのみ描画。 */
  private fillQuad3D(
    camera: Camera,
    corners: Vec3[],
    fill: string,
    edge?: string,
  ): void {
    const { ctx } = this;
    const pts = corners.map((c) => camera.project(c));
    if (pts.some((p) => !p.visible)) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  private strokeLine3D(camera: Camera, a: Vec3, b: Vec3): void {
    const { ctx } = this;
    const pa = camera.project(a);
    const pb = camera.project(b);
    if (!pa.visible || !pb.visible) return;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  private drawTargets(targets: TargetManager, camera: Camera): void {
    const { ctx } = this;
    // 奥(z大)から手前(z小)の順に描画。
    const sorted = [...targets.getTargets()].sort(
      (a, b) => b.position.z - a.position.z,
    );
    for (const t of sorted) {
      const p = camera.project(t.position);
      if (!p.visible) continue;
      // スタンド: 床から的までの縦線。距離(奥行き)を読み取る手掛かり。
      ctx.save();
      ctx.strokeStyle = StageConfig.standColor;
      ctx.lineWidth = Math.max(1, 1.5 * p.scale * 0.05);
      this.strokeLine3D(
        camera,
        { x: t.position.x, y: WorldConfig.floorY, z: t.position.z },
        { x: t.position.x, y: t.position.y, z: t.position.z },
      );
      ctx.restore();
      const r = t.radius * p.scale;
      const isHit = t.state === TargetState.Hit;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? TargetConfig.colorHit : TargetConfig.color;
      ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.06);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
    }
  }

  /** ボールとその軌跡 (Trail) を投影して描画する。 */
  private drawProjectiles(
    projectiles: ProjectileSystem,
    camera: Camera,
  ): void {
    const { ctx } = this;
    const sorted = [...projectiles.getProjectiles()].sort(
      (a, b) => b.position.z - a.position.z,
    );
    for (const proj of sorted) {
      // Trail: 古い点ほど細く・薄く。
      const pts = proj.trail;
      for (let i = 1; i < pts.length; i++) {
        const a = camera.project(pts[i - 1].pos);
        const b = camera.project(pts[i].pos);
        if (!a.visible || !b.visible) continue;
        const ratio = i / pts.length;
        ctx.save();
        ctx.globalAlpha = ratio * 0.7;
        ctx.strokeStyle = WorldConfig.ballColor;
        ctx.lineWidth = Math.max(1, proj.radius * b.scale * ratio);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
      // ボール本体
      const c = camera.project(proj.position);
      if (!c.visible) continue;
      const r = Math.max(1.5, proj.radius * c.scale);
      ctx.save();
      ctx.fillStyle = WorldConfig.ballColor;
      ctx.shadowColor = WorldConfig.ballColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawMarkers(feedback: FeedbackManager): void {
    const { ctx } = this;
    for (const m of feedback.getMarkers()) {
      if (m.kind !== 'hit') continue;
      const alpha = Math.max(0, m.life / m.maxLife);
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

  /** 画面下中央(手元)から照準点へ向かう破線。投げる「方向」を示す。 */
  private drawAimGuide(cursor: CursorController): void {
    if (cursor.getState() !== TrackingState.Tracking) return;
    const { ctx, canvas } = this;
    const aim = cursor.getPosition();
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = CursorConfig.colorTracking;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height);
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
