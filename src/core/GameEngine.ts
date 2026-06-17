import { CameraConfig, TargetConfig, TemplatesConfig } from '../config/GameConfig';
import { Assets } from './Assets';
import { Camera } from './Camera';
import { EventBus, type GameBus } from './EventBus';
import { CursorController } from '../cursor/CursorController';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { ScoreManager } from '../score/ScoreManager';
import type { StageTemplate } from '../stage/StageTemplate';
import { createTemplate } from '../stage/templates';
import { TrackingState, type PointerResult, type TemplateName, type Vec2 } from './types';

export type InputMode = 'camera' | 'remote';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { ProjectileSystem } from '../weapon/ProjectileSystem';
import { Renderer } from '../ui/Renderer';

/**
 * GameEngine
 * 責務: 各モジュールを束ね、ゲームループを回す。
 *       Aim   : MediaPipeBridge + CursorController
 *       Shot  : AutoFireSystem → ProjectileSystem.launch
 *       Flight: ProjectileSystem (3D重力放物線)
 *       Result: 球vs球衝突 → StageTemplate.onHit → ScoreManager (Event駆動)
 *       Correct: FeedbackManager + Renderer (弾道/着弾/スコアを見て修正)
 */
export class GameEngine {
  private readonly bus: GameBus = new EventBus();
  private readonly bridge = new MediaPipeBridge();
  private readonly assets = new Assets();
  private readonly camera: Camera;
  private readonly cursor: CursorController;
  private readonly projectiles = new ProjectileSystem();
  private readonly score = new ScoreManager();
  private readonly feedback = new FeedbackManager();
  private readonly autoFire: AutoFireSystem;
  private readonly renderer: Renderer;
  private template: StageTemplate;
  private templateName: TemplateName = TemplatesConfig.default;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  /** remote(スマホ)入力時の最新照準。 */
  private remoteAim: Vec2 | null = null;

  /** UI への通知 (Event駆動)。 */
  onScoreChange: (score: number) => void = () => {};
  onStatusChange: (status: string) => void = () => {};

  constructor(
    private readonly video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    private readonly inputMode: InputMode = 'camera',
  ) {
    const w = CameraConfig.width;
    const h = CameraConfig.height;
    canvas.width = w;
    canvas.height = h;

    this.assets.load();
    this.camera = new Camera(w, h);
    this.cursor = new CursorController(w, h);
    this.renderer = new Renderer(canvas, this.assets);
    this.autoFire = new AutoFireSystem(() => this.handleFire());
    this.template = createTemplate(this.templateName, this.bus);

    // --- Event 配線 ---
    this.bus.on('hit', ({ score, point }) => {
      const p = this.camera.project(point);
      if (p.visible) {
        this.feedback.addHit({ x: p.x, y: p.y }, score);
        // 割れる演出 (破片)。的のおおよその画面半径ぶん。
        this.feedback.addBreak({ x: p.x, y: p.y }, TargetConfig.radius * p.scale);
      }
    });
    this.bus.on('scoreChanged', ({ total }) => this.onScoreChange(total));
    this.bus.on('status', ({ text }) => this.onStatusChange(text));
  }

  async start(): Promise<void> {
    if (this.inputMode === 'camera') {
      await this.bridge.init();
      await this.setupCamera();
    }
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  /** remote(スマホ)から照準を受け取る (正規化 0..1)。 */
  setRemoteAim(x: number, y: number): void {
    this.remoteAim = { x, y };
  }

  /** ステージテンプレートを切り替える (UI から)。 */
  setTemplate(name: TemplateName): void {
    this.templateName = name;
    this.template = createTemplate(name, this.bus);
    this.projectiles.clear();
    this.score.reset();
    this.bus.emit('scoreChanged', { total: 0 });
    this.bus.emit('status', { text: this.template.displayName });
  }

  getTemplateName(): TemplateName {
    return this.templateName;
  }

  private async setupCamera(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: CameraConfig.width,
        height: CameraConfig.height,
        facingMode: CameraConfig.facingMode,
      },
      audio: false,
    });
    this.video.srcObject = stream;
    await this.video.play();
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // --- Aim (カメラ or スマホ) ---
    const pointer: PointerResult =
      this.inputMode === 'camera'
        ? this.bridge.detect(this.video, now)
        : this.remoteAim
          ? { state: TrackingState.Tracking, position: this.remoteAim }
          : { state: TrackingState.Lost, position: null };
    this.cursor.update(pointer, dt);

    // --- Shot (自動連射: Tracking 中のみ) ---
    this.autoFire.update(dt, this.cursor.isTracking());

    // --- ステージ更新 + Flight + Result ---
    this.template.update(dt);
    const hits = this.projectiles.update(dt, this.template.getTargets());
    for (const hit of hits) {
      const gained = this.template.onHit(hit.target);
      this.score.add(gained);
      this.bus.emit('hit', {
        score: gained,
        point: hit.point,
        type: hit.target.type,
      });
      this.bus.emit('scoreChanged', { total: this.score.getScore() });
    }
    this.score.update(dt);
    this.feedback.update(dt);

    // --- 描画 (Correction) ---
    this.renderer.render(
      this.template,
      this.cursor,
      this.feedback,
      this.projectiles,
      this.camera,
      this.score.getCombo(),
    );

    this.rafId = requestAnimationFrame(this.loop);
  };

  /** AutoFireSystem からの発射イベント。照準レイ方向へボールを投げる。 */
  private handleFire(): void {
    const ray = this.camera.screenToRay(this.cursor.getPosition());
    this.projectiles.launch(ray);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.bridge.dispose();
    const stream = this.video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
  }
}
