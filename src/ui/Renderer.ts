import {
  ArenaConfig,
  AssetConfig,
  CursorConfig,
  FeedbackConfig,
  TargetConfig,
  WorldConfig,
} from '../config/GameConfig';
import type { Assets } from '../core/Assets';
import type { Camera } from '../core/Camera';
import type { Player } from '../core/Player';
import { TargetState, TargetType, TrackingState, type Vec3 } from '../core/types';
import type { CursorController } from '../cursor/CursorController';
import type { FeedbackManager } from '../feedback/FeedbackManager';
import type { SceneProp } from '../stage/Scene';
import type { StageTemplate } from '../stage/StageTemplate';
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
    private readonly assets: Assets,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context を取得できません');
    this.ctx = ctx;
  }

  render(
    template: StageTemplate,
    players: Player[],
    feedback: FeedbackManager,
    projectiles: ProjectileSystem,
    camera: Camera,
  ): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const useImageBg = !!template.backgroundKey;
    this.drawBackground(useImageBg);

    const props = template.getProps?.() ?? [];
    if (!useImageBg) this.drawFloorGrid(camera);
    // 背景プロップ(ひな壇/丘など)を奥から描く。
    this.drawProps(props.filter((p) => !this.isForeground(p)), camera);
    if (!useImageBg) this.drawGuides(template, camera);
    this.drawWorld(template, projectiles, camera);
    // 手前の遮蔽物(柵)は的より前に。
    this.drawProps(props.filter((p) => this.isForeground(p)), camera);

    this.drawDebris(feedback);
    this.drawScoreTexts(feedback);
    this.drawMarkers(feedback);
    // 各プレイヤーのカーソルを色分けで描画。
    for (const p of players) {
      if (p.connected) this.drawCursor(p.cursor, p.color);
    }
  }

  /**
   * 的と弾を奥行き(z)順に描く。奥のものから描くので、的より奥に行った球は
   * 的に隠れて見えなくなる(オクルージョン)→「上を狙うと的の奥に落ちる」が分かる。
   */
  private drawWorld(
    template: StageTemplate,
    projectiles: ProjectileSystem,
    camera: Camera,
  ): void {
    type Item =
      | { z: number; kind: 't'; t: ReturnType<StageTemplate['getTargets']>[number] }
      | { z: number; kind: 'p'; p: ReturnType<ProjectileSystem['getProjectiles']>[number] }
      | { z: number; kind: 'o'; o: { x: number; y: number; z: number; radius: number } };
    const items: Item[] = [];
    for (const t of template.getTargets()) items.push({ z: t.position.z, kind: 't', t });
    for (const p of projectiles.getProjectiles()) items.push({ z: p.position.z, kind: 'p', p });
    for (const o of template.getObstacles?.() ?? []) items.push({ z: o.z, kind: 'o', o });
    items.sort((a, b) => b.z - a.z); // 奥(z大)から手前(z小)へ
    for (const it of items) {
      if (it.kind === 't') this.drawTargetOne(it.t, camera);
      else if (it.kind === 'p') this.drawProjectileOne(it.p, camera);
      else this.drawObstacle(it.o, camera);
    }
  }

  private drawObstacle(
    o: { x: number; y: number; z: number; radius: number },
    camera: Camera,
  ): void {
    const { ctx } = this;
    const p = camera.project({ x: o.x, y: o.y, z: o.z });
    if (!p.visible) return;
    const r = o.radius * p.scale;
    ctx.save();
    ctx.fillStyle = 'rgba(90, 80, 70, 0.9)';
    ctx.strokeStyle = 'rgba(40, 35, 30, 0.9)';
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private isForeground(p: SceneProp): boolean {
    return p.kind === 'fence' && p.foreground;
  }

  private drawBackground(useImage: boolean): void {
    const { ctx, canvas, assets } = this;
    if (useImage && assets.backgroundReady) {
      // cover フィット (アスペクトを保ち画面を埋める)。
      const img = assets.background;
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height,
      );
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#0b1733');
    g.addColorStop(0.55, '#10243f');
    g.addColorStop(1, '#06101f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawFloorGrid(camera: Camera): void {
    const { ctx } = this;
    const y = WorldConfig.floorY;
    const hw = ArenaConfig.halfWidth + 2;
    const { gridZStart, gridZEnd, gridStep } = ArenaConfig;
    ctx.save();
    ctx.strokeStyle = ArenaConfig.gridColor;
    ctx.lineWidth = 1;
    for (let x = -hw; x <= hw + 0.001; x += gridStep) {
      this.strokeLine3D(camera, { x, y, z: gridZStart }, { x, y, z: gridZEnd });
    }
    for (let z = gridZStart; z <= gridZEnd + 0.001; z += gridStep) {
      this.strokeLine3D(camera, { x: -hw, y, z }, { x: hw, y, z });
    }
    ctx.restore();
  }

  private drawGuides(template: StageTemplate, camera: Camera): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = ArenaConfig.guideColor;
    ctx.lineWidth = 1.5;
    for (const g of template.getGuides()) {
      this.strokeLine3D(camera, g.a, g.b);
    }
    ctx.restore();
  }

  /** シーン装飾(背景/建物/ひな壇)を描く。platformは3D面、その他はビルボード。 */
  private drawProps(props: SceneProp[], camera: Camera): void {
    const sorted = [...props].sort((a, b) => b.base.z - a.base.z);
    for (const p of sorted) {
      if (p.kind === 'platform') {
        this.drawPlatform(p, camera);
        continue;
      }
      const b = camera.project(p.base);
      if (!b.visible) continue;
      const s = b.scale;
      this.drawProp(p, b.x, b.y, p.width * s, p.height * s);
    }
  }

  /** ひな壇の1段を3Dの板(上面+前面)として描く。 */
  private drawPlatform(
    p: Extract<SceneProp, { kind: 'platform' }>,
    camera: Camera,
  ): void {
    const { y, z } = p.base;
    const hw = p.halfWidth;
    // 前面(立ち上がり)
    this.fillQuad3D(
      camera,
      [
        { x: -hw, y, z },
        { x: hw, y, z },
        { x: hw, y: p.yBottom, z },
        { x: -hw, y: p.yBottom, z },
      ],
      'rgba(60,70,55,0.85)',
    );
    // 上面
    this.fillQuad3D(
      camera,
      [
        { x: -hw, y, z: p.zFar },
        { x: hw, y, z: p.zFar },
        { x: hw, y, z },
        { x: -hw, y, z },
      ],
      p.color,
      p.edge,
    );
  }

  private drawProp(
    p: SceneProp,
    cx: number,
    groundY: number,
    w: number,
    h: number,
  ): void {
    const { ctx } = this;
    const top = groundY - h;
    ctx.save();
    switch (p.kind) {
      case 'hill':
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(cx, groundY, w / 2, h, 0, Math.PI, 0);
        ctx.fill();
        break;
      case 'pond':
        ctx.fillStyle = 'rgba(47,127,209,0.75)';
        ctx.beginPath();
        ctx.ellipse(cx, groundY, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'windmill': {
        ctx.strokeStyle = '#cfd6de';
        ctx.lineWidth = Math.max(2, w * 0.25);
        ctx.beginPath();
        ctx.moveTo(cx, groundY);
        ctx.lineTo(cx, top);
        ctx.stroke();
        // 回転する4枚羽根。
        const blade = h * 0.45;
        ctx.strokeStyle = '#eef3f9';
        ctx.lineWidth = Math.max(2, w * 0.18);
        for (let i = 0; i < 4; i++) {
          const a = p.angle + (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(cx, top);
          ctx.lineTo(cx + Math.cos(a) * blade, top + Math.sin(a) * blade);
          ctx.stroke();
        }
        break;
      }
      case 'silo':
        ctx.fillStyle = '#9aa3ad';
        ctx.fillRect(cx - w / 2, top, w, h);
        ctx.fillStyle = '#6b7682';
        ctx.beginPath();
        ctx.ellipse(cx, top, w / 2, h * 0.12, 0, Math.PI, 0);
        ctx.fill();
        break;
      case 'cactus':
        ctx.fillStyle = '#3a8f4f';
        ctx.fillRect(cx - w / 4, top, w / 2, h);
        ctx.fillRect(cx - w / 2, top + h * 0.4, w / 4, h * 0.1);
        ctx.fillRect(cx + w / 4, top + h * 0.3, w / 4, h * 0.1);
        break;
      case 'fence': {
        ctx.strokeStyle = '#e8eef5';
        ctx.lineWidth = Math.max(2, h * 0.12);
        const left = cx - w / 2;
        const right = cx + w / 2;
        // 横レール2本
        ctx.beginPath();
        ctx.moveTo(left, top + h * 0.3);
        ctx.lineTo(right, top + h * 0.3);
        ctx.moveTo(left, top + h * 0.7);
        ctx.lineTo(right, top + h * 0.7);
        ctx.stroke();
        // 縦杭
        const posts = 14;
        for (let i = 0; i <= posts; i++) {
          const x = left + (w * i) / posts;
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, groundY);
          ctx.stroke();
        }
        break;
      }
      case 'barn': {
        const bodyH = h * 0.62;
        const bodyTop = groundY - bodyH;
        // 本体(赤)
        ctx.fillStyle = '#b5462f';
        ctx.fillRect(cx - w / 2, bodyTop, w, bodyH);
        // 屋根(白)
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath();
        ctx.moveTo(cx - w / 2 - w * 0.05, bodyTop);
        ctx.lineTo(cx + w / 2 + w * 0.05, bodyTop);
        ctx.lineTo(cx, top);
        ctx.closePath();
        ctx.fill();
        // 入口(暗い)
        const doorW = w * 0.5;
        const doorH = bodyH * 0.72;
        const doorY = groundY - doorH;
        ctx.fillStyle = '#140d06';
        ctx.fillRect(cx - doorW / 2, doorY, doorW, doorH);
        // 観音開きの扉(白)。openで両側へ縮む。
        const panel = (doorW / 2) * (1 - p.doorOpen);
        ctx.fillStyle = '#e8e8e8';
        ctx.strokeStyle = '#b04a30';
        ctx.lineWidth = 2;
        if (panel > 0.5) {
          ctx.fillRect(cx - doorW / 2, doorY, panel, doorH);
          ctx.strokeRect(cx - doorW / 2, doorY, panel, doorH);
          ctx.fillRect(cx + doorW / 2 - panel, doorY, panel, doorH);
          ctx.strokeRect(cx + doorW / 2 - panel, doorY, panel, doorH);
        }
        break;
      }
    }
    ctx.restore();
  }

  private drawTargetOne(
    t: ReturnType<StageTemplate['getTargets']>[number],
    camera: Camera,
  ): void {
    const { ctx } = this;
    const p = camera.project(t.position);
    if (!p.visible) return;

    const r = t.radius * p.scale;
    const isHit = t.state === TargetState.Hit;
    // 命中の瞬間は割れる演出のため少し拡大して描く。
    const drawR = isHit ? r * 1.25 : r;

    // 出現アニメ: 倒れた的が立ち上がる(下端を軸に縦スケール)。
    const sy = t.spawnScaleY();
    const animated = sy !== 1;
    if (animated) {
      const bottomY = p.y + r;
      ctx.save();
      ctx.translate(0, bottomY);
      ctx.scale(1, sy);
      ctx.translate(0, -bottomY);
    }

    // スプライト的 (画像) があれば優先して描く。不透明で奥の球を隠す。
    if (t.iconIndex !== null && this.assets.targetsReady) {
      this.drawSprite(t.iconIndex, p.x, p.y, drawR, isHit);
      this.drawValueLabel(t, p.x, p.y, r);
      if (animated) ctx.restore();
      return;
    }

    // スタンド: 床から的への縦線 (3D描画ステージのみ)。
    ctx.save();
    ctx.strokeStyle = ArenaConfig.standColor;
    ctx.lineWidth = 1;
    this.strokeLine3D(
      camera,
      { x: t.position.x, y: WorldConfig.floorY, z: t.position.z },
      { x: t.position.x, y: t.position.y, z: t.position.z },
    );
    ctx.restore();

    const baseColor = TargetConfig.colors[t.type];
    ctx.save();
    if (t.type === TargetType.HighValue || t.type === TargetType.Bonus) {
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 20;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
    ctx.fillStyle = isHit ? '#ffffff' : baseColor;
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.stroke();
    ctx.restore();

    if (t.label) {
      ctx.save();
      ctx.fillStyle = '#001018';
      ctx.font = `bold ${Math.max(12, r)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, p.x, p.y);
      ctx.restore();
    }

    this.drawValueLabel(t, p.x, p.y, r);
    if (animated) ctx.restore();
  }

  /** 的の得点を下に表示 (中得点以上のみ。狙う優先度の手掛かり)。 */
  private drawValueLabel(
    t: ReturnType<StageTemplate['getTargets']>[number],
    cx: number,
    cy: number,
    r: number,
  ): void {
    if (t.scoreValue < 300) return;
    const { ctx } = this;
    const big = t.scoreValue >= 1000;
    ctx.save();
    ctx.font = `bold ${Math.max(11, r * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.fillStyle = big ? '#ffd60a' : '#ffffff';
    const ty = cy + r + 2;
    ctx.strokeText(String(t.scoreValue), cx, ty);
    ctx.fillText(String(t.scoreValue), cx, ty);
    ctx.restore();
  }

  /** 的スプライトシートの1セルを円形に切り抜いて描く。 */
  private drawSprite(
    icon: number,
    cx: number,
    cy: number,
    r: number,
    isHit: boolean,
  ): void {
    const { ctx, assets } = this;
    const img = assets.targets;
    // 解析済みの赤リング中心・半径で切り抜く (白余白なし)。
    const rect =
      AssetConfig.iconRects[icon] ?? AssetConfig.iconRects[0];
    const halfPx = rect[2] * img.width * AssetConfig.iconPad;
    const srcX = rect[0] * img.width - halfPx;
    const srcY = rect[1] * img.height - halfPx;
    const side = halfPx * 2;
    ctx.save();
    if (isHit) ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, side, side, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    // 命中時のみ白フチで強調 (通常は絵の赤リングをそのまま活かす)。
    if (isHit) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawProjectileOne(
    proj: ReturnType<ProjectileSystem['getProjectiles']>[number],
    camera: Camera,
  ): void {
    const { ctx } = this;
    const pts = proj.trail;
    for (let i = 1; i < pts.length; i++) {
      const a = camera.project(pts[i - 1].pos);
      const b = camera.project(pts[i].pos);
      if (!a.visible || !b.visible) continue;
      const ratio = i / pts.length;
      ctx.save();
      ctx.globalAlpha = ratio * 0.7;
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = Math.max(1, proj.radius * b.scale * ratio);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
    const c = camera.project(proj.position);
    if (!c.visible) return;
    const r = Math.max(1.5, proj.radius * c.scale);
    ctx.save();
    ctx.fillStyle = proj.color;
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

  /** 3Dの4頂点ポリゴンを投影して塗る。全頂点が前方のときのみ。 */
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
}
