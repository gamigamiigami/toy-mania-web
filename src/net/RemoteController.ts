import { Peer, type DataConnection } from 'peerjs';
import { type AimMessage, type FireMessage, type HostMessage } from './messages';
import { peerOptions } from './peerOptions';

/**
 * open を待つ上限 (ms)。
 * モバイル回線ではICEの経路探索に10秒以上かかることがあるので短くしすぎない。
 * (短いと、つながりかけの接続を自分で壊してしまう)
 */
const OPEN_TIMEOUT_MS = 20000;
/** これ以上失敗したら「同じWi-Fiに」という対処法を出す。 */
const TROUBLE_AFTER = 2;
/** 再試行の上限。 */
const MAX_ATTEMPTS = 20;

/**
 * RemoteController
 * 責務: スマホ(コントローラ)側のWebRTC接続。ホストID(room)へ繋ぎ照準/発射を送る。
 *       公開ブローカの不安定さに備え、未登録/切断/無反応のいずれでも張り直す。
 *
 * 重要: 同時に持つ接続は常に1本だけ。古い接続を閉じずに張り直すと、
 *       ホスト側のプレイヤー枠を1台で複数消費してしまい、
 *       2人目以降が入れなくなる。
 */
export class RemoteController {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private attempts = 0;
  private disposed = false;
  private full = false;
  private timer: number | null = null;
  private lastIce = '';

  onOpen: () => void = () => {};
  onClosed: () => void = () => {};
  onError: (message: string) => void = () => {};
  onAssign: (player: number, color: string, name: string) => void = () => {};
  /** ホストが満員で受け入れを断った。 */
  onFull: () => void = () => {};
  /** ICE(経路探索)の状態。接続できない原因の切り分け用。 */
  onIceState: (state: string) => void = () => {};
  /** 何度も失敗している時の対処法 (空文字なら解消)。 */
  onTrouble: (advice: string) => void = () => {};

  constructor(private readonly hostId: string) {
    this.boot();
  }

  private boot(): void {
    if (this.disposed) return;
    this.peer = new Peer(peerOptions());
    this.peer.on('open', () => this.connect());
    this.peer.on('disconnected', () => {
      try {
        this.peer?.reconnect();
      } catch {
        /* noop */
      }
    });
    this.peer.on('error', (e: { type?: string }) => {
      const type = e?.type ?? 'error';
      if (type === 'peer-unavailable') {
        // ホスト未登録/取りこぼし → 少し待って張り直す。
        this.retry('ホストを探しています');
        return;
      }
      this.onError(type);
      this.retry(type);
    });
  }

  /** 現在の接続を完全に破棄する (リスナーごと)。 */
  private dropConn(): void {
    const c = this.conn;
    this.conn = null;
    if (!c) return;
    try {
      c.removeAllListeners?.();
      c.close();
    } catch {
      /* noop */
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private retry(reason: string): void {
    if (this.disposed || this.full) return;
    this.clearTimer();
    this.dropConn();
    if (this.attempts >= MAX_ATTEMPTS) {
      this.onError('接続できませんでした。QRを読み直してください');
      return;
    }
    this.attempts += 1;
    this.onError(`${reason}…(${this.attempts})`);
    if (this.attempts >= TROUBLE_AFTER) {
      this.onTrouble(
        this.lastIce === 'failed' || this.lastIce === 'disconnected'
          ? 'スマホとゲーム画面の間に通信経路が作れません。両方を同じWi-Fiにつないでください（スマホがモバイル回線だとつながらないことがあります）。'
          : 'つながりません。①両方を同じWi-Fiにつなぐ ②ゲーム画面側で「ルームを作り直す（QR更新）」を押して読み直す、を試してください。',
      );
    }
    // 軽い指数バックオフ (最大4秒)。同時接続の輻輳をずらす意味もある。
    const wait = Math.min(4000, 700 * this.attempts) + Math.random() * 300;
    this.timer = window.setTimeout(() => this.connect(), wait);
  }

  /** 手動リトライ (UIの再接続ボタン)。 */
  reconnect(): void {
    if (this.disposed) return;
    this.full = false;
    this.attempts = 0;
    this.clearTimer();
    this.dropConn();
    if (this.peer && !this.peer.destroyed && this.peer.open) this.connect();
    else {
      try {
        this.peer?.destroy();
      } catch {
        /* noop */
      }
      this.boot();
    }
  }

  private connect(): void {
    if (this.disposed || this.full) return;
    this.clearTimer();
    this.dropConn();
    const peer = this.peer;
    if (!peer || peer.destroyed) return;

    // reliable: 発射(fire)の取りこぼしは体験を壊すので信頼性を優先する。
    const conn = peer.connect(this.hostId, { reliable: true });
    this.conn = conn;

    // 無反応(ICE失敗など)を検出して張り直す。
    this.timer = window.setTimeout(() => {
      if (this.conn === conn && !conn.open) this.retry('接続をやり直しています');
    }, OPEN_TIMEOUT_MS);

    conn.on('open', () => {
      if (this.conn !== conn) return;
      this.clearTimer();
      this.attempts = 0;
      this.onTrouble('');
      this.onOpen();
    });
    conn.on('close', () => {
      if (this.conn !== conn) return;
      this.onClosed();
      this.retry('切断されました。再接続');
    });
    conn.on('error', () => {
      if (this.conn !== conn) return;
      this.retry('接続エラー。再接続');
    });
    conn.on('iceStateChanged', (state) => {
      if (this.conn !== conn) return;
      this.lastIce = state;
      this.onIceState(state);
      // failed = NAT越えに失敗 (別ネットワーク間で起きやすい)。張り直す。
      if (state === 'failed') this.retry('経路が見つかりません。再試行');
    });
    conn.on('data', (data) => {
      const msg = data as HostMessage;
      if (!msg) return;
      if (msg.t === 'assign') this.onAssign(msg.player, msg.color, msg.name);
      else if (msg.t === 'full') {
        this.full = true;
        this.clearTimer();
        this.onFull();
      }
    });
  }

  sendAim(x: number, y: number): void {
    if (this.conn && this.conn.open) {
      const msg: AimMessage = { t: 'aim', x, y };
      this.conn.send(msg);
    }
  }

  sendFire(curve: number): void {
    if (this.conn && this.conn.open) {
      const msg: FireMessage = { t: 'fire', curve };
      this.conn.send(msg);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    this.dropConn();
    try {
      this.peer?.destroy();
    } catch {
      /* noop */
    }
    this.peer = null;
  }
}
