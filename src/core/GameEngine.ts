import {
  CameraConfig,
  PlayerConfig,
  RoundConfig,
  TargetConfig,
  TemplatesConfig,
} from '../config/GameConfig';
import { Assets } from './Assets';
import { Camera } from './Camera';
import { EventBus, type GameBus } from './EventBus';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { Player } from './Player';
import type { StageTemplate } from '../stage/StageTemplate';
import { createTemplate } from '../stage/templates';
import { TrackingState, type PointerResult, type TemplateName } from './types';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { ProjectileSystem } from '../weapon/ProjectileSystem';
import { Renderer } from '../ui/Renderer';

export type InputMode = 'camera' | 'remote';
export type Phase = 'playing' | 'result';

/**
 * GameEngine
 * 責務: 各モジュールを束ね、ゲームループを回す。対戦(最大2人)とラウンド制(30秒)を管理。
 */
export class GameEngine {
  private readonly bus: GameBus = new EventBus();
  private readonly bridge = new MediaPipeBridge();
  private readonly assets = new Assets();
  private readonly camera: Camera;
  private readonly projectiles = new ProjectileSystem();
  private readonly feedback = new FeedbackManager();
  private readonly autoFire: AutoFireSystem;
  private readonly renderer: Renderer;
  private readonly players: Player[];
  private template: StageTemplate;
  private templateName: TemplateName = TemplatesConfig.default;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private phase: Phase = 'playing';
  private timeLeft = RoundConfig.durationSec;
  private resultLeft = 0;

  /** UI への通知。 */
  onScoreChange: (playerId: number, score: number) => void = () => {};
  onStatusChange: (status: string) => void = () => {};
  onTime: (secondsLeft: number) => void = () => {};
  onRoundOver: (scores: number[]) => void = () => {};
  onRoundStart: () => void = () => {};
  onPlayerConnected: (playerId: number) => void = () => {};

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
    this.renderer = new Renderer(canvas, this.assets);
    this.autoFire = new AutoFireSystem(() => this.fire(0, 0));
    this.template = createTemplate(this.templateName);
    this.players = [];
    for (let i = 0; i < PlayerConfig.maxPlayers; i++) {
      this.players.push(
        new Player(i, PlayerConfig.colors[i], PlayerConfig.names[i], w, h),
      );
    }
    // カメラ操作はプレイヤー1のみ。
    if (inputMode === 'camera') this.players[0].connected = true;

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

  /** スマホ接続時にスロットを有効化。 */
  connectPlayer(id: number): void {
    if (this.players[id]) {
      this.players[id].connected = true;
      this.onPlayerConnected(id);
    }
  }

  setRemoteAim(id: number, x: number, y: number): void {
    const p = this.players[id];
    if (p) p.remoteAim = { x, y };
  }

  /** スワイプ発射 (curve: -1..1)。 */
  fire(id: number, curve: number): void {
    const p = this.players[id];
    if (!p || !p.connected) return;
    const ray = this.camera.screenToRay(p.cursor.getPosition());
    this.projectiles.launch(ray, curve, id, p.color);
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

  private updateAim(dt: number, now: number): void {
    for (const p of this.players) {
      if (!p.connected) continue;
      let pointer: PointerResult;
      if (this.inputMode === 'camera' && p.id === 0) {
        pointer = this.bridge.detect(this.video, now);
      } else {
        pointer = p.remoteAim
          ? { state: TrackingState.Tracking, position: p.remoteAim }
          : { state: TrackingState.Lost, position: null };
      }
      p.cursor.update(pointer, dt);
    }
  }

  private startRound(): void {
    for (const p of this.players) p.reset();
    this.template = createTemplate(this.templateName);
    this.projectiles.clear();
    this.timeLeft = RoundConfig.durationSec;
    this.phase = 'playing';
    this.players.forEach((p) => this.onScoreChange(p.id, 0));
    this.onRoundStart();
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.updateAim(dt, now); // 照準は常時更新
    this.feedback.update(dt);

    if (this.phase === 'playing') {
      this.timeLeft -= dt;
      this.onTime(Math.max(0, Math.ceil(this.timeLeft)));

      if (this.inputMode === 'camera') {
        this.autoFire.update(dt, this.players[0].cursor.isTracking());
      }

      this.template.update(dt);
      const hits = this.projectiles.update(dt, this.template.getTargets());
      for (const hit of hits) {
        const gained = this.template.onHit(hit.target);
        const pl = this.players[hit.playerId];
        pl?.score.add(gained);
        const proj = this.camera.project(hit.point);
        if (proj.visible && pl) {
          this.feedback.addHit({ x: proj.x, y: proj.y }, gained, pl.color);
          this.feedback.addBreak(
            { x: proj.x, y: proj.y },
            TargetConfig.radius * proj.scale,
          );
        }
        if (pl) this.onScoreChange(pl.id, pl.score.getScore());
      }
      for (const p of this.players) p.score.update(dt);

      if (this.timeLeft <= 0) {
        this.phase = 'result';
        this.resultLeft = RoundConfig.resultSec;
        this.onRoundOver(this.players.map((p) => p.score.getScore()));
      }
    } else {
      // リザルト中はゲームを止めて表示。
      this.resultLeft -= dt;
      if (this.resultLeft <= 0) this.startRound();
    }

    this.renderer.render(
      this.template,
      this.players,
      this.feedback,
      this.projectiles,
      this.camera,
    );

    this.rafId = requestAnimationFrame(this.loop);
  };

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.bridge.dispose();
    const stream = this.video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
  }
}
