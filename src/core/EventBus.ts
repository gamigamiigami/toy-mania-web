import type { TargetType, Vec3 } from './types';

/**
 * ゲーム内イベントの型マップ (Event 駆動の中心)。
 * モジュール間は EventBus 経由で疎結合に連携する。
 */
export type GameEventMap = {
  /** ターゲット命中。 */
  hit: { score: number; point: Vec3; type: TargetType };
  /** 合計スコア更新。 */
  scoreChanged: { total: number };
  /** ステージ状況テキスト更新 (連鎖進捗など、HUD表示用)。 */
  status: { text: string };
  /** ボーナス解放。 */
  bonusSpawned: Record<string, never>;
};

type Handler<T> = (payload: T) => void;

/**
 * EventBus
 * 責務: 型安全な発行/購読 (Pub/Sub)。
 */
export class EventBus<T extends Record<string, unknown>> {
  private handlers: { [K in keyof T]?: Array<Handler<T[K]>> } = {};

  on<K extends keyof T>(key: K, handler: Handler<T[K]>): void {
    (this.handlers[key] ??= []).push(handler);
  }

  emit<K extends keyof T>(key: K, payload: T[K]): void {
    this.handlers[key]?.forEach((h) => h(payload));
  }
}

export type GameBus = EventBus<GameEventMap>;
