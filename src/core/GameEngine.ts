import {
  CameraConfig,
  PlayerConfig,
  RoundConfig,
  STAGE_INFO,
} from '../config/GameConfig';
import { Assets } from './Assets';
import { Camera } from './Camera';
import { EventBus, type GameBus } from './EventBus';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { Player } from './Player';
import { Sound } from './Sound';
import type { StageTemplate } from '../stage/StageTemplate';
import { createTemplate } from '../stage/templates';
import { TrackingState, type PointerResult, type TemplateName } from './types';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { ProjectileSystem } from '../weapon/ProjectileSystem';
import { Renderer } from '../ui/Renderer';

export type InputMode = 'camera' | 'remote';
export type Phase = 'waiting' | 'playing' | 'results';

/** ライド1回分の最終結果。 */
export interface RunResult {
  scores: number[];
  accuracies: number[];
  connected: boolean[];
}

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
  private readonly sound = new Sound();
  private stageIndex = 0;
  private template: StageTemplate;
  private templateName: TemplateName = STAGE_INFO[0].name as TemplateName;

  private rafId = 0;
  private lastTime = 0;
  private running = false;
  private phase: Phase = 'waiting';
  private roundDuration: number = RoundConfig.durationSec;
  private timeLeft: number = RoundConfig.durationSec;
  /** ライド開始時のステージ (ここに戻ってきたら1周=終了)。 */
  private runStartIndex = 0;
  /** 画面シェイクの残量 (px)。大物命中で発生し減衰。 */
  private shake = 0;
  /** カウントダウンtick用 (直前に鳴らした整数秒)。 */
  private lastTickSec = -1;

  /** UI への通知。 */
  onScoreChange: (playerId: number, score: number) => void = () => {};
  onStatusChange: (status: string) => void = () => {};
  onTime: (secondsLeft: number) => void = () => {};
  onRoundOver: (scores: number[]) => void = () => {};
  onRoundStart: () => void = () => {};
  onWaiting: () => void = () => {};
  onPlayerConnected: (playerId: number) => void = () => {};
  /** コンボ更新 (HUD表示用)。 */
  onCombo: (playerId: number, combo: number) => void = () => {};
  /** ライド1周が終わった (最終リザルト表示用)。 */
  onRunOver: (result: RunResult) => void = () => {};
  /** 次にプレイするステージ名 (待機中に表示)。 */
  onStage: (label: string) => void = () => {};

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
    this.onStage(STAGE_INFO[this.stageIndex].label);
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

  /** スワイプ発射 (curve: -1..1)。リザルト中は撃てない。 */
  fire(id: number, curve: number): void {
    if (this.phase === 'results') return;
    const p = this.players[id];
    if (!p || !p.connected) return;
    p.shots += 1;
    const ray = this.camera.screenToRay(p.cursor.getPosition());
    this.projectiles.launch(ray, curve, id, p.color);
    this.sound.fire();
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

  /** ライド開始 (ホストが手動でスタート)。ここから5ステージ1周のラン。 */
  startMatch(): void {
    this.sound.init(); // ユーザー操作で音声を起動
    this.runStartIndex = this.stageIndex;
    for (const p of this.players) p.reset();
    this.template = createTemplate(this.templateName);
    this.projectiles.clear();
    this.timeLeft = this.roundDuration;
    this.lastTickSec = -1;
    this.phase = 'playing';
    this.players.forEach((p) => this.onScoreChange(p.id, 0));
    this.onTime(this.roundDuration);
    this.sound.stageStart();
    this.onRoundStart();
  }

  /** リザルトからロビーへ戻る。 */
  toLobby(): void {
    this.phase = 'waiting';
    for (const p of this.players) p.reset();
    this.template = createTemplate(this.templateName);
    this.projectiles.clear();
    this.players.forEach((p) => this.onScoreChange(p.id, 0));
    this.onTime(this.roundDuration);
    this.onWaiting();
  }

  /** 指定ステージへ即切り替えて開始 (テストプレイ用)。 */
  selectStage(index: number): void {
    const len = STAGE_INFO.length;
    this.stageIndex = ((index % len) + len) % len;
    this.templateName = STAGE_INFO[this.stageIndex].name as TemplateName;
    this.onStage(STAGE_INFO[this.stageIndex].label);
    this.startMatch();
  }

  getStageIndex(): number {
    return this.stageIndex;
  }

  /** ラウンド時間(秒)を変更する (設定画面から)。 */
  setDuration(sec: number): void {
    this.roundDuration = sec;
    if (this.phase !== 'playing') {
      this.timeLeft = sec;
      this.onTime(sec);
    }
  }

  /** 次ステージへ移動 (ゲームは止めず、スコアは累積)。1周したらリザルトへ。 */
  private advanceStage(): void {
    const next = (this.stageIndex + 1) % STAGE_INFO.length;
    if (next === this.runStartIndex) {
      this.endRun();
      return;
    }
    this.stageIndex = next;
    this.templateName = STAGE_INFO[this.stageIndex].name as TemplateName;
    this.template = createTemplate(this.templateName);
    this.projectiles.clear();
    this.timeLeft = this.roundDuration;
    this.lastTickSec = -1;
    this.sound.stageStart();
    this.onTime(this.roundDuration);
    this.onStage(STAGE_INFO[this.stageIndex].label);
  }

  /** ライド終了: ファンファーレ + 紙吹雪 + 最終リザルト。 */
  private endRun(): void {
    this.phase = 'results';
    this.projectiles.clear();
    this.sound.finale();
    this.feedback.addConfetti(CameraConfig.width, CameraConfig.height);
    this.onRunOver({
      scores: this.players.map((p) => p.score.getScore()),
      accuracies: this.players.map((p) => p.accuracy()),
      connected: this.players.map((p) => p.connected),
    });
  }

  /** 現在ステージのテーマ色。 */
  getTheme(): string {
    return STAGE_INFO[this.stageIndex].theme;
  }

  /** ゲーム本体の進行 (待機中も warmup として動かす)。 */
  private runGameplay(dt: number, now: number): void {
    if (this.inputMode === 'camera') {
      this.autoFire.update(dt, this.players[0].cursor.isTracking());
    }
    void now;
    this.template.update(dt);
    const obstacles = this.template.getObstacles?.() ?? [];
    const hits = this.projectiles.update(
      dt,
      this.template.getTargets(),
      obstacles,
    );
    for (const hit of hits) {
      const base = this.template.onHit(hit.target);
      const pl = this.players[hit.playerId];
      if (!pl) continue;
      pl.hits += 1;
      const awarded = pl.score.add(base); // コンボ倍率込みの実加点
      if (awarded >= 600) this.shake = Math.min(14, this.shake + 8); // 大物は画面が揺れる
      this.sound.hit(awarded);
      const proj = this.camera.project(hit.point);
      if (proj.visible) {
        this.feedback.addHit(
          { x: proj.x, y: proj.y },
          awarded,
          pl.color,
          pl.score.getCombo(),
        );
        this.feedback.addBreak(
          { x: proj.x, y: proj.y },
          hit.target.radius * proj.scale,
        );
      }
      if (this.phase === 'playing') {
        this.onScoreChange(pl.id, pl.score.getScore());
        this.onCombo(pl.id, pl.score.getCombo());
      }
    }
    for (const p of this.players) p.score.update(dt);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.updateAim(dt, now); // 照準は常時更新
    this.feedback.update(dt);
    if (this.phase !== 'results') {
      this.runGameplay(dt, now); // 移動中もゲームは止めない(乗り物に乗りながら)
    }

    if (this.phase === 'playing') {
      this.timeLeft -= dt;
      const sec = Math.max(0, Math.ceil(this.timeLeft));
      this.onTime(sec);
      // 残り3秒はカウントダウンtick。
      if (sec <= 3 && sec >= 1 && sec !== this.lastTickSec) {
        this.lastTickSec = sec;
        this.sound.tick();
      }
      if (this.timeLeft <= 0) this.advanceStage(); // 次ステージへゆっくり移動
    }

    // 画面シェイク減衰。
    this.shake = Math.max(0, this.shake - dt * 40);

    this.renderer.render(
      this.template,
      this.players,
      this.feedback,
      this.projectiles,
      this.camera,
      this.shake,
      this.getTheme(),
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
