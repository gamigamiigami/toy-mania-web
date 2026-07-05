import {
  CameraConfig,
  PlayerConfig,
  RoundConfig,
  STAGE_INFO,
} from '../config/GameConfig';
import { Camera } from './Camera';
import { EventBus, type GameBus } from './EventBus';
import { FeedbackManager } from '../feedback/FeedbackManager';
import { MediaPipeBridge } from '../input/MediaPipeBridge';
import { Player } from './Player';
import { Sound } from './Sound';
import type { StageTemplate } from '../stage/StageTemplate';
import { createTemplate } from '../stage/templates';
import { TrackingState, type PointerResult } from './types';
import { AutoFireSystem } from '../weapon/AutoFireSystem';
import { ProjectileSystem } from '../weapon/ProjectileSystem';
import { OverlayRenderer } from '../render/OverlayRenderer';
import { ThreeRenderer } from '../render/ThreeRenderer';

export type InputMode = 'camera' | 'remote';
export type Phase = 'waiting' | 'playing' | 'finished';

/** 1プレイヤーの最終成績。 */
export interface PlayerResult {
  id: number;
  name: string;
  color: string;
  score: number;
  shots: number;
  hits: number;
  /** 命中率 0..1。 */
  accuracy: number;
}

/**
 * GameEngine
 * 責務: 各モジュールを束ね、ゲームループを回す。
 *       本家準拠の7シーン (練習→6ゲーム) を巡回し、最後にリザルトを出す。
 */
export class GameEngine {
  private readonly bus: GameBus = new EventBus();
  private readonly bridge = new MediaPipeBridge();
  private readonly camera: Camera;
  private readonly projectiles = new ProjectileSystem();
  private readonly feedback = new FeedbackManager();
  private readonly autoFire: AutoFireSystem;
  private readonly three: ThreeRenderer;
  private readonly overlay: OverlayRenderer;
  private readonly players: Player[];
  private readonly sound = new Sound();
  private stageIndex = 0;
  private template: StageTemplate;

  private rafId = 0;
  private lastTime = 0;
  private elapsedSec = 0;
  private running = false;
  private phase: Phase = 'waiting';
  /** ユーザー設定のステージ時間 (30秒基準の倍率として各ステージへ適用)。 */
  private baseDuration: number = RoundConfig.durationSec;
  private timeLeft: number = RoundConfig.durationSec;

  /** UI への通知。 */
  onScoreChange: (playerId: number, score: number) => void = () => {};
  onStatusChange: (status: string) => void = () => {};
  onTime: (secondsLeft: number) => void = () => {};
  onRoundStart: () => void = () => {};
  onWaiting: () => void = () => {};
  onPlayerConnected: (playerId: number) => void = () => {};
  /** コンボ更新 (HUD表示用)。 */
  onCombo: (playerId: number, combo: number) => void = () => {};
  /** ステージ名 (待機中/切替時に表示)。 */
  onStage: (label: string) => void = () => {};
  /** 全シーン終了 → リザルト。 */
  onGameOver: (results: PlayerResult[]) => void = () => {};

  constructor(
    private readonly video: HTMLVideoElement,
    glCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    private readonly inputMode: InputMode = 'camera',
  ) {
    const w = CameraConfig.width;
    const h = CameraConfig.height;
    glCanvas.width = w;
    glCanvas.height = h;
    overlayCanvas.width = w;
    overlayCanvas.height = h;

    this.camera = new Camera(w, h);
    this.three = new ThreeRenderer(glCanvas);
    this.overlay = new OverlayRenderer(overlayCanvas);
    this.autoFire = new AutoFireSystem(
      () => this.fire(0, 0),
      () => this.template.weapon.fireIntervalSec,
    );
    this.template = createTemplate(STAGE_INFO[0].name);
    this.three.setStage(this.template);
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

  /** 1発撃つ (スワイプ/自動連射)。curve: -1..1。 */
  fire(id: number, curve: number): void {
    const p = this.players[id];
    if (!p || !p.connected) return;
    const ray = this.camera.screenToRay(p.cursor.getPosition());
    this.projectiles.launch(ray, this.template.weapon, curve, id, p.color);
    if (this.phase === 'playing') p.shots += 1;
    this.sound.fire(this.template.weapon.kind);
  }

  getStageIndex(): number {
    return this.stageIndex;
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

  /** ステージ i の制限時間 (ユーザー設定を30秒基準の倍率として適用)。 */
  private stageDuration(i: number): number {
    const scale = this.baseDuration / RoundConfig.durationSec;
    return Math.max(3, STAGE_INFO[i].durationSec * scale);
  }

  /** ライド開始 (ホストが手動でスタート)。練習シーンから巡回する。 */
  startMatch(): void {
    this.sound.init(); // ユーザー操作で音声を起動
    for (const p of this.players) p.reset();
    this.stageIndex = 0;
    this.setStage(0);
    this.timeLeft = this.stageDuration(0);
    this.phase = 'playing';
    this.players.forEach((p) => this.onScoreChange(p.id, 0));
    this.onTime(Math.ceil(this.timeLeft));
    this.onRoundStart();
  }

  /** 指定ステージへ即切り替えて開始 (テストプレイ用)。 */
  selectStage(index: number): void {
    const len = STAGE_INFO.length;
    const i = ((index % len) + len) % len;
    this.sound.init();
    this.stageIndex = i;
    this.setStage(i);
    this.timeLeft = this.stageDuration(i);
    if (this.phase !== 'playing') {
      this.phase = 'playing';
      this.onRoundStart();
    }
    this.onTime(Math.ceil(this.timeLeft));
  }

  private setStage(i: number): void {
    this.template = createTemplate(STAGE_INFO[i].name);
    this.three.setStage(this.template);
    this.projectiles.clear();
    this.onStage(STAGE_INFO[i].label);
  }

  /** ステージ時間(秒)を変更する (設定画面から)。 */
  setDuration(sec: number): void {
    this.baseDuration = sec;
    if (this.phase !== 'playing') {
      this.timeLeft = sec;
      this.onTime(sec);
    }
  }

  /** 次ステージへ移動 (ゲームは止めず、スコアは累積)。最後まで行ったらリザルト。 */
  private advanceStage(): void {
    if (this.stageIndex >= STAGE_INFO.length - 1) {
      this.finish();
      return;
    }
    this.stageIndex += 1;
    this.setStage(this.stageIndex);
    this.timeLeft = this.stageDuration(this.stageIndex);
    this.sound.roundEnd();
    this.onTime(Math.ceil(this.timeLeft));
  }

  /** 全シーン終了 → 成績を集計してリザルトへ。 */
  private finish(): void {
    this.phase = 'finished';
    this.sound.fanfare();
    const results: PlayerResult[] = this.players
      .filter((p) => p.connected)
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: p.score.getScore(),
        shots: p.shots,
        hits: p.score.getHits(),
        accuracy: p.accuracy(),
      }));
    this.onGameOver(results);
  }

  /** ゲーム本体の進行 (待機中も warmup として動かす)。 */
  private runGameplay(dt: number): void {
    if (this.inputMode === 'camera') {
      this.autoFire.update(dt, this.players[0].cursor.isTracking());
    }
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
      const awarded = pl.score.add(base);
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
    // ステージ内で起きた出来事 (扉・噴火・ロケット等) を効果音に。
    for (const ev of this.template.consumeEvents?.() ?? []) {
      this.sound.stageEvent(ev);
    }
    for (const p of this.players) p.score.update(dt);
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsedSec += dt;

    this.updateAim(dt, now); // 照準は常時更新
    this.feedback.update(dt);
    this.runGameplay(dt); // 移動中もゲームは止めない(乗り物に乗りながら)

    if (this.phase === 'playing') {
      this.timeLeft -= dt;
      this.onTime(Math.max(0, Math.ceil(this.timeLeft)));
      if (this.timeLeft <= 0) this.advanceStage(); // 次ステージへ
    }

    this.three.render(this.template, this.projectiles, this.elapsedSec);
    this.overlay.render(this.players, this.feedback, this.projectiles, this.camera);

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
