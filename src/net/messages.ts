/** スマホ(コントローラ) → 画面(ホスト) へ送るメッセージ。 */
export interface AimMessage {
  t: 'aim';
  /** 正規化照準 (0..1)。 */
  x: number;
  y: number;
}

/** スワイプ発射。curve は横カーブ量 (-1..1、0=直進)。 */
export interface FireMessage {
  t: 'fire';
  curve: number;
}

export type ControllerMessage = AimMessage | FireMessage;

/** 画面(ホスト) → スマホ へ: プレイヤー割当(色/番号)。 */
export interface AssignMessage {
  t: 'assign';
  player: number;
  color: string;
  name: string;
}

export type HostMessage = AssignMessage;

/** ルームコードからPeerJSのIDを作る (公開ブローカ上の衝突を避けるため接頭辞)。 */
export function peerIdForRoom(code: string): string {
  return `toymania-v1-${code}`;
}

/** 4文字のルームコードを生成 (紛らわしい文字を除外)。 */
export function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
