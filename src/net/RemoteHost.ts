import { Peer, type DataConnection } from 'peerjs';
import {
  makeRoomCode,
  peerIdForRoom,
  type ControllerMessage,
} from './messages';

/**
 * RemoteHost
 * 責務: 画面(ホスト)側のWebRTC接続。ルームを開いてスマホからの照準を受け取る。
 *       PeerJSの無料公開ブローカで仲介(サーバー不要・無料)。
 */
export class RemoteHost {
  readonly code: string;
  private peer: Peer;
  private conn: DataConnection | null = null;

  /** スマホ接続時。 */
  onConnected: () => void = () => {};
  /** 照準受信 (正規化 0..1)。 */
  onAim: (x: number, y: number) => void = () => {};
  /** 発射受信 (curve: -1..1)。 */
  onFire: (curve: number) => void = () => {};
  /** 切断時。 */
  onClosed: () => void = () => {};

  constructor() {
    this.code = makeRoomCode();
    this.peer = new Peer(peerIdForRoom(this.code));
    this.peer.on('connection', (conn) => {
      this.conn = conn;
      conn.on('open', () => this.onConnected());
      conn.on('data', (data) => {
        const msg = data as ControllerMessage;
        if (!msg) return;
        if (msg.t === 'aim') this.onAim(msg.x, msg.y);
        else if (msg.t === 'fire') this.onFire(msg.curve);
      });
      conn.on('close', () => this.onClosed());
    });
  }

  /** コントローラ用URL (このページに ?role=controller&room=CODE を付与)。 */
  controllerUrl(): string {
    const base = `${location.origin}${import.meta.env.BASE_URL}`;
    return `${base}?role=controller&room=${this.code}`;
  }

  dispose(): void {
    this.conn?.close();
    this.peer.destroy();
  }
}
