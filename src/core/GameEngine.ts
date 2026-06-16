import { CameraConfig } from '../config/GameConfig';
import { Camera } from './Camera';
import { CursorController } from '../cursor/CursorController';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { ScoreManager } from '../score/ScoreManager';
import { Stage } from '../stage/Stage';
import { TargetManager } from '../target/TargetManager';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { ProjectileSystem } from '../weapon/ProjectileSystem';
import { Renderer } from '../ui/Renderer';

/**
 * GameEngine
 * 責務: 各モジュールを束ね、ゲームループ (Aim→Shot→Flight→Result→Correction) を回す。
 *       Aim   : MediaPipeBridge + CursorController
 *       Shot  : AutoFireSystem → ProjectileSystem.launch
 *       Flight: ProjectileSystem (重力で放物線飛行)
 *       Result: ProjectileSystem の物理衝突 + Target + ScoreManager
 *       Correct: FeedbackManager + Renderer (弾道を見て修正)
 */
export class GameEngine {
  private readonly bridge = new MediaPipeBridge();
  private readonly camera: Camera;
  private readonly stage: Stage;
  private readonly cursor: CursorController;
  private readonly targets: TargetManager;
  private readonly projectiles: ProjectileSystem;
  private readonly score = new ScoreManager();
  private readonly feedback = new FeedbackManager();
  private readonly autoFire: AutoFireSystem;
  private readonly renderer: Renderer;

  private rafId = 0;
  private lastTime = 0;
  private running = false;

  /** スコア更新を UI へ通知するコールバック */
  onScoreChange: (score: number) => void = () => {};

  constructor(
    private readonly video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) {
    const w = CameraConfig.width;
    const h = CameraConfig.height;
    canvas.width = w;
    canvas.height = h;

    this.camera = new Camera(w, h);
    this.stage = new Stage();
    this.cursor = new CursorController(w, h);
    this.targets = new TargetManager(this.stage);
    this.projectiles = new ProjectileSystem();
    this.renderer = new Renderer(canvas, video);
    this.autoFire = new AutoFireSystem(() => this.handleFire());
  }

  /** カメラと MediaPipe を初期化してループを開始する。 */
  async start(): Promise<void> {
    await this.bridge.init();
    await this.setupCamera();
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
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

    // --- Aim ---
    const pointer = this.bridge.detect(this.video, now);
    this.cursor.update(pointer, dt);

    // --- Shot (自動連射: Tracking 中のみ) ---
    this.autoFire.update(dt, this.cursor.isTracking());

    // --- 状態更新 ---
    this.targets.update(dt);
    // Flight + Result: 弾を飛ばし、物理衝突で命中判定する。
    const hits = this.projectiles.update(dt, this.targets.getTargets());
    for (const hit of hits) {
      this.score.addHit();
      // 命中点(3D)をスクリーンへ投影してフィードバック表示。
      const p = this.camera.project(hit.point);
      if (p.visible) this.feedback.addHit({ x: p.x, y: p.y });
      this.onScoreChange(this.score.getScore());
    }
    this.feedback.update(dt);

    // --- 描画 (Correction: 弾道を見て狙いを修正) ---
    this.renderer.render(
      this.stage,
      this.targets,
      this.cursor,
      this.feedback,
      this.projectiles,
      this.camera,
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
