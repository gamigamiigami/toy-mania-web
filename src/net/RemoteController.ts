import { Peer, type DataConnection } from 'peerjs';
import {
  peerIdForRoom,
  type AimMessage,
  type FireMessage,
  type HostMessage,
} from './messages';

/**
 * RemoteController
 * 責務: スマホ(コントローラ)側のWebRTC接続。ホストのルームへ繋ぎ照準を送る。
 */
export class RemoteController {
  private peer: Peer;
  private conn: DataConnection | null = null;
  onOpen: () => void = () => {};
  onClosed: () => void = () => {};
  /** ホストからのプレイヤー割当 (色/番号)。 */
  onAssign: (player: number, color: string, name: string) => void = () => {};

  constructor(private readonly code: string) {
    this.peer = new Peer();
    this.peer.on('open', () => {
      this.conn = this.peer.connect(peerIdForRoom(this.code), {
        reliable: false,
      });
      this.conn.on('open', () => this.onOpen());
      this.conn.on('close', () => this.onClosed());
      this.conn.on('data', (data) => {
        const msg = data as HostMessage;
        if (msg && msg.t === 'assign') {
          this.onAssign(msg.player, msg.color, msg.name);
        }
      });
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
