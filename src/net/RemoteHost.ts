import { Peer, type DataConnection } from 'peerjs';
import { PlayerConfig } from '../config/GameConfig';
import { type AssignMessage, type ControllerMessage, type FullMessage } from './messages';

/** 接続してきたが open しないまま放置された接続を諦めるまでの時間 (ms)。 */
const OPEN_TIMEOUT_MS = 12000;

/**
 * RemoteHost
 * 責務: 画面(ホスト)側のWebRTC接続。PeerJSの無料公開ブローカで仲介(サーバー不要)。
 *       ID衝突を避けるためランダムIDを採用し、open後に接続URLを通知する。
 *       最大4台のスマホを接続順にプレイヤー番号へ割り当てる。
 *
 * 重要: プレイヤー枠は「接続イベント」ではなく「open 完了」で確保する。
 *       途中で失敗した接続やリトライの残骸が枠を食い潰し、2人目以降が
 *       入れなくなるのを防ぐため。閉じた接続の枠は都度解放する。
 */
export class RemoteHost {
  private peer: Peer;
  private conns: (DataConnection | null)[] = Array.from(
    { length: PlayerConfig.maxPlayers },
    () => null,
  );
  /** PeerJSが割り当てたID (= room)。open まで空。 */
  id = '';

  /** 接続準備完了 (ID確定)。 */
  onReady: () => void = () => {};
  onConnected: (playerId: number) => void = () => {};
  onAim: (playerId: number, x: number, y: number) => void = () => {};
  onFire: (playerId: number, curve: number) => void = () => {};
  onClosed: (playerId: number) => void = () => {};
  onError: (message: string) => void = () => {};
  /** 満員で受け入れを断った (ホスト側の表示用)。 */
  onRejected: () => void = () => {};

  constructor() {
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.id = id;
      this.onReady();
    });
    this.peer.on('disconnected', () => {
      try {
        this.peer.reconnect(); // ブローカから切れても登録を維持
      } catch {
        /* noop */
      }
    });
    this.peer.on('error', (e: { type?: string }) => {
      const type = e?.type ?? 'error';
      // 個別接続の失敗でホスト全体をエラー表示にしない。
      if (type === 'peer-unavailable' || type === 'network') return;
      this.onError(type);
    });
    this.peer.on('connection', (conn) => this.accept(conn));
  }

  /** 生きていない接続の枠を解放する。 */
  private purge(): void {
    this.conns.forEach((c, i) => {
      if (c && !c.open) this.conns[i] = null;
    });
  }

  /** open した接続に空き枠を割り当てる。空きが無ければ -1。 */
  private take(conn: DataConnection): number {
    this.purge();
    // 同じ接続が既に入っていればその枠を使う (二重 open 対策)。
    const exist = this.conns.indexOf(conn);
    if (exist >= 0) return exist;
    const id = this.conns.findIndex((c) => c === null);
    if (id >= 0) this.conns[id] = conn;
    return id;
  }

  /** この接続が持っている枠を解放する。 */
  private release(conn: DataConnection): void {
    const id = this.conns.indexOf(conn);
    if (id < 0) return;
    this.conns[id] = null;
    this.onClosed(id);
  }

  private accept(conn: DataConnection): void {
    // open しないまま居座る接続は諦める (枠は open 時にしか取らないので枠は減らない)。
    const giveUp = window.setTimeout(() => {
      if (!conn.open) {
        try {
          conn.close();
        } catch {
          /* noop */
        }
      }
    }, OPEN_TIMEOUT_MS);

    conn.on('open', () => {
      window.clearTimeout(giveUp);
      const id = this.take(conn);
      if (id < 0) {
        const full: FullMessage = { t: 'full' };
        conn.send(full);
        this.onRejected();
        window.setTimeout(() => conn.close(), 500);
        return;
      }
      const assign: AssignMessage = {
        t: 'assign',
        player: id,
        color: PlayerConfig.colors[id],
        name: PlayerConfig.names[id],
      };
      conn.send(assign);
      this.onConnected(id);
    });

    conn.on('data', (data) => {
      const msg = data as ControllerMessage;
      if (!msg) return;
      const id = this.conns.indexOf(conn);
      if (id < 0) return;
      if (msg.t === 'aim') this.onAim(id, msg.x, msg.y);
      else if (msg.t === 'fire') this.onFire(id, msg.curve);
    });

    conn.on('close', () => {
      window.clearTimeout(giveUp);
      this.release(conn);
    });
    conn.on('error', () => {
      window.clearTimeout(giveUp);
      this.release(conn);
    });
  }

  /** 現在つながっている台数 (枠の掃除込み)。 */
  activeCount(): number {
    this.purge();
    return this.conns.filter((c) => c !== null).length;
  }

  /** 全接続を切って枠を空にする (ホストUIの「接続リセット」用)。 */
  kickAll(): void {
    this.conns.forEach((c, i) => {
      try {
        c?.close();
      } catch {
        /* noop */
      }
      if (c) {
        this.conns[i] = null;
        this.onClosed(i);
      }
    });
  }

  /** 短い表示用コード (IDの末尾)。 */
  roomLabel(): string {
    return this.id.slice(-4).toUpperCase();
  }

  /** コントローラ用URL (?role=controller&room=<peerId>)。 */
  controllerUrl(): string {
    const base = `${location.origin}${import.meta.env.BASE_URL}`;
    return `${base}?role=controller&room=${encodeURIComponent(this.id)}`;
  }

  dispose(): void {
    this.conns.forEach((c) => c?.close());
    this.peer.destroy();
  }
}
