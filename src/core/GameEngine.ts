import { CameraConfig } from '../config/GameConfig';
import { CursorController } from '../cursor/CursorController';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { ScoreManager } from '../score/ScoreManager';
import { TargetManager } from '../target/TargetManager';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { HitScanWeapon } from '../weapon/HitScanWeapon';
import { Renderer } from '../ui/Renderer';

/**
 * GameEngine
 * 責務: 各モジュールを束ね、ゲームループ (Aim→Shot→Result→Correction) を回す。
 *       Aim   : MediaPipeBridge + CursorController
 *       Shot  : AutoFireSystem
 *       Result: HitScanWeapon + Target + ScoreManager
 *       Correct: FeedbackManager + Renderer
 */
export class GameEngine {
  private readonly bridge = new MediaPipeBridge();
  private readonly cursor: CursorController;
  private readonly targets: TargetManager;
  private readonly weapon = new HitScanWeapon();
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

    this.cursor = new CursorController(w, h);
    this.targets = new TargetManager(w, h);
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
    this.feedback.update(dt);

    // --- 描画 (Correction) ---
    this.renderer.render(this.targets, this.cursor, this.feedback);

    this.rafId = requestAnimationFrame(this.loop);
  };

  /** AutoFireSystem からの発射イベント。HitScan → スコア/フィードバック。 */
  private handleFire(): void {
    const aim = this.cursor.getPosition();
    // 命中/外れに関わらず、まず「撃った」フィードバック (曳光線) を出す。
    this.feedback.addShot(aim);
    const result = this.weapon.fire(aim, this.targets.getTargets());
    if (result.hit && result.target) {
      result.target.hit();
      this.score.addHit();
      this.feedback.addHit(result.point);
      this.onScoreChange(this.score.getScore());
    } else {
      this.feedback.addMiss(result.point);
    }
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
