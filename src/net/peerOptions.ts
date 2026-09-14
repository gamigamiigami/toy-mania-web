import type { PeerOptions } from 'peerjs';

/**
 * peerOptions
 * 責務: PeerJS の接続設定を1か所にまとめる。
 *
 * 別デバイス間 (特に「PCは自宅Wi-Fi / スマホは4G・5G」) の接続は、
 * お互いのNATを越えるために STUN / TURN が要る。
 * STUN は相手から見える自分のアドレスを教えてくれるだけなので、
 * 厳しいNAT (携帯キャリアなど) では TURN での中継が必須になる。
 *
 * `?broker=host:port[/path]` を付けると自前のPeerJSブローカに切り替わる
 * (同一LAN内での動作確認や、公開ブローカが不調なときの逃げ道)。
 */

/** 既定のICEサーバ。公開の無料サーバなので確実ではない。 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
    username: 'peerjs',
    credential: 'peerjsp',
  },
];

/** `?turn=turn:host:port,user,pass` で自前TURNを差し込む (最優先で使う)。 */
function extraTurn(params: URLSearchParams): RTCIceServer | null {
  const raw = params.get('turn');
  if (!raw) return null;
  const [urls, username, credential] = raw.split(',');
  if (!urls) return null;
  return username ? { urls, username, credential } : { urls };
}

export function peerOptions(): PeerOptions {
  const params = new URLSearchParams(location.search);
  const turn = extraTurn(params);
  const opts: PeerOptions = {
    config: {
      iceServers: turn ? [turn, ...ICE_SERVERS] : ICE_SERVERS,
      // 候補集めを打ち切らない (TURN候補が間に合わず失敗するのを防ぐ)。
      iceCandidatePoolSize: 2,
    },
  };

  const broker = params.get('broker');
  if (broker) {
    const [hostPort, ...rest] = broker.split('/');
    const [host, port] = hostPort.split(':');
    opts.host = host;
    opts.port = port ? Number(port) : 443;
    opts.path = rest.length ? `/${rest.join('/')}` : '/';
    opts.secure = params.get('brokerSecure') !== '0';
  }
  return opts;
}

/** コントローラのURL (QR) に、ホストと同じブローカ/TURN指定を引き継ぐ。 */
export function inheritNetParams(): string {
  const params = new URLSearchParams(location.search);
  const out: string[] = [];
  for (const key of ['broker', 'brokerSecure', 'turn']) {
    const v = params.get(key);
    if (v) out.push(`${key}=${encodeURIComponent(v)}`);
  }
  return out.length ? `&${out.join('&')}` : '';
}
