import { Peer, type DataConnection } from 'peerjs';
import { PlayerConfig } from '../config/GameConfig';
import { type AssignMessage, type ControllerMessage } from './messages';

/**
 * RemoteHost
 * 責務: 画面(ホスト)側のWebRTC接続。PeerJSの無料公開ブローカで仲介(サーバー不要)。
 *       ID衝突を避けるためランダムIDを採用し、open後に接続URLを通知する。
 *       最大2台→4台のスマホを接続順にプレイヤー番号へ割り当てる。
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

  constructor() {
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.id = id;
      this.onReady();
    });
    this.peer.on('error', (e: { type?: string }) => {
      this.onError(e?.type ?? 'error');
    });
    this.peer.on('connection', (conn) => this.accept(conn));
  }

  private accept(conn: DataConnection): void {
    const id = this.conns.findIndex((c) => c === null);
    if (id < 0) {
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
