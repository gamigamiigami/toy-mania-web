import { Peer, type DataConnection } from 'peerjs';
import { PlayerConfig } from '../config/GameConfig';
import {
  makeRoomCode,
  peerIdForRoom,
  type AssignMessage,
  type ControllerMessage,
} from './messages';

/**
 * RemoteHost
 * 責務: 画面(ホスト)側のWebRTC接続。1ルームに最大2台のスマホを受け入れ、
 *       接続順にプレイヤー番号(0/1)を割り当てて照準・発射を受け取る。
 *       PeerJSの無料公開ブローカで仲介(サーバー不要)。
 */
export class RemoteHost {
  readonly code: string;
  private peer: Peer;
  private conns: (DataConnection | null)[] = Array.from(
    { length: PlayerConfig.maxPlayers },
    () => null,
  );

  onConnected: (playerId: number) => void = () => {};
  onAim: (playerId: number, x: number, y: number) => void = () => {};
  onFire: (playerId: number, curve: number) => void = () => {};
  onClosed: (playerId: number) => void = () => {};

  constructor() {
    this.code = makeRoomCode();
    this.peer = new Peer(peerIdForRoom(this.code));
    this.peer.on('connection', (conn) => this.accept(conn));
  }

  private accept(conn: DataConnection): void {
    const id = this.conns.findIndex((c) => c === null);
    if (id < 0) {
      // 満員。
      conn.on('open', () => conn.close());
      return;
    }
    this.conns[id] = conn;
    conn.on('open', () => {
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
      if (msg.t === 'aim') this.onAim(id, msg.x, msg.y);
      else if (msg.t === 'fire') this.onFire(id, msg.curve);
    });
    conn.on('close', () => {
      this.conns[id] = null;
      this.onClosed(id);
    });
  }

  /** コントローラ用URL (このページに ?role=controller&room=CODE を付与)。 */
  controllerUrl(): string {
    const base = `${location.origin}${import.meta.env.BASE_URL}`;
    return `${base}?role=controller&room=${this.code}`;
  }

  dispose(): void {
    this.conns.forEach((c) => c?.close());
    this.peer.destroy();
  }
}
