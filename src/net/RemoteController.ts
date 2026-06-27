import { Peer, type DataConnection } from 'peerjs';
import { type AimMessage, type FireMessage, type HostMessage } from './messages';

/**
 * RemoteController
 * 責務: スマホ(コントローラ)側のWebRTC接続。ホストID(room)へ繋ぎ照準/発射を送る。
 *       公開ブローカの不安定さに備え、未登録/切断時はリトライする。
 */
export class RemoteController {
  private peer: Peer;
  private conn: DataConnection | null = null;
  private retries = 0;
  private opened = false;
  onOpen: () => void = () => {};
  onClosed: () => void = () => {};
  onError: (message: string) => void = () => {};
  onAssign: (player: number, color: string, name: string) => void = () => {};

  constructor(private readonly hostId: string) {
    this.peer = new Peer();
    this.peer.on('open', () => this.connect());
    this.peer.on('disconnected', () => {
      try {
        this.peer.reconnect();
      } catch {
        /* noop */
      }
    });
    this.peer.on('error', (e: { type?: string }) => {
      const type = e?.type ?? 'error';
      // ホスト未登録: ホスト初期化待ちの可能性→少し待って再接続。
      if (type === 'peer-unavailable' && this.retries < 6 && !this.opened) {
        this.retries += 1;
        setTimeout(() => this.connect(), 900);
        this.onError(`接続中…(${this.retries})`);
        return;
      }
      this.onError(type);
    });
  }

  private connect(): void {
    const conn = this.peer.connect(this.hostId, { reliable: false });
    this.conn = conn;
    conn.on('open', () => {
      this.opened = true;
      this.onOpen();
    });
    conn.on('close', () => this.onClosed());
    conn.on('data', (data) => {
      const msg = data as HostMessage;
      if (msg && msg.t === 'assign') {
        this.onAssign(msg.player, msg.color, msg.name);
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
    this.conn?.close();
    this.peer.destroy();
  }
}
