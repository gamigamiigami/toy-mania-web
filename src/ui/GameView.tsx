import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PlayerConfig } from '../config/GameConfig';
import { GameEngine } from '../core/GameEngine';
import { RemoteHost } from '../net/RemoteHost';

type Phase = 'idle' | 'loading' | 'playing' | 'error';
type MatchPhase = 'waiting' | 'playing' | 'result';

/**
 * GameView (画面側)
 * 責務: 操作方法の選択、スマホ接続(QR)、開始の手動管理、2人対戦HUD。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hostRef = useRef<RemoteHost | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('waiting');
  const [isPhone, setIsPhone] = useState(false);
  const [scores, setScores] = useState<number[]>(() =>
    PlayerConfig.colors.map(() => 0),
  );
  const [connected, setConnected] = useState<boolean[]>(() =>
    PlayerConfig.colors.map(() => false),
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [qr, setQr] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      hostRef.current?.dispose();
    };
  }, []);

  const wireEngine = (engine: GameEngine) => {
    engine.onScoreChange = (id, s) =>
      setScores((arr) => {
        const next = [...arr];
        next[id] = s;
        return next;
      });
    engine.onTime = setTimeLeft;
    engine.onRoundStart = () => {
      setResult(null);
      setMatchPhase('playing');
    };
    engine.onRoundOver = (sc) => {
      setResult(sc);
      setMatchPhase('result');
    };
    engine.onWaiting = () => setMatchPhase('waiting');
    engine.onPlayerConnected = (id) =>
      setConnected((arr) => {
        const next = [...arr];
        next[id] = true;
        return next;
      });
  };

  const handleCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase('loading');
    setIsPhone(false);
    try {
      const engine = new GameEngine(videoRef.current, canvasRef.current, 'camera');
      wireEngine(engine);
      engineRef.current = engine;
      setConnected(PlayerConfig.colors.map((_, i) => i === 0));
      await engine.start();
      setMatchPhase('waiting');
      setPhase('playing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const handlePhone = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsPhone(true);
    try {
      const host = new RemoteHost();
      hostRef.current = host;
      setRoom(host.code);
      setQr(await QRCode.toDataURL(host.controllerUrl(), { width: 220, margin: 1 }));

      const engine = new GameEngine(videoRef.current, canvasRef.current, 'remote');
      wireEngine(engine);
      engineRef.current = engine;

      host.onConnected = (id) => engine.connectPlayer(id);
      host.onAim = (id, x, y) => engine.setRemoteAim(id, x, y);
      host.onFire = (id, curve) => engine.fire(id, curve);
      host.onClosed = (id) =>
        setConnected((arr) => {
          const next = [...arr];
          next[id] = false;
          return next;
        });

      await engine.start();
      setMatchPhase('waiting');
      setPhase('playing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const startMatch = () => engineRef.current?.startMatch();

  const ids = PlayerConfig.names.map((_, i) => i);

  const winnerText = (sc: number[]): string => {
    const conn = ids.filter((id) => connected[id]);
    if (conn.length <= 1) return `スコア ${sc[conn[0] ?? 0] ?? 0}`;
    const max = Math.max(...conn.map((id) => sc[id] ?? 0));
    const winners = conn.filter((id) => (sc[id] ?? 0) === max);
    if (winners.length > 1) return '引き分け！';
    return `${PlayerConfig.names[winners[0]]} の勝ち！`;
  };

  const canStart = isPhone ? connected.some((c) => c) : true;

  return (
    <div className="game-root">
      <div className="stage">
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={canvasRef} className="game-canvas" />

        {phase === 'playing' && (
          <>
            <div className="vs-hud">
              <div className="players">
                {ids.map((id) =>
                  connected[id] ? (
                    <span
                      key={id}
                      className="p"
                      style={{ color: PlayerConfig.colors[id] }}
                    >
                      {PlayerConfig.names[id]} {scores[id]}
                    </span>
                  ) : null,
                )}
              </div>
              <span className="timer">{timeLeft}</span>
            </div>

            {matchPhase === 'waiting' && (
              <div className="join-panel">
                <h2>{isPhone ? 'スマホで参加 → スタート' : '準備OK？'}</h2>
                {isPhone && qr && <img className="qr" src={qr} alt="QR" />}
                {isPhone && (
                  <>
                    <p className="room">ルーム <b>{room}</b></p>
                    <div className="join-chips">
                      {ids.map((id) => (
                        <span key={id} style={{ color: PlayerConfig.colors[id] }}>
                          {connected[id]
                            ? `● ${PlayerConfig.names[id]}`
                            : `○ ${PlayerConfig.names[id]}`}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <button
                  className="start-btn"
                  onClick={startMatch}
                  disabled={!canStart}
                >
                  ▶ スタート（30秒）
                </button>
                {isPhone && !canStart && (
                  <p className="hint-small">スマホが1台つながると開始できます</p>
                )}
              </div>
            )}

            {matchPhase === 'result' && result && (
              <div className="result-panel">
                <h1>TIME UP!</h1>
                <div className="result-scores">
                  {ids.map((id) =>
                    connected[id] ? (
                      <span key={id} style={{ color: PlayerConfig.colors[id] }}>
                        {PlayerConfig.names[id]}: {result[id]}
                      </span>
                    ) : null,
                  )}
                </div>
                <p className="winner">{winnerText(result)}</p>
                <p className="next">まもなく待機画面へ…</p>
              </div>
            )}
          </>
        )}

        {phase !== 'playing' && (
          <div className="overlay">
            <h1>まとあて 3D シューティング</h1>
            <p className="subtitle">Toy Mania風 ・ 2人対戦</p>
            {phase === 'idle' && (
              <>
                <p>操作方法を選んでください。</p>
                <div className="mode-row">
                  <button className="start-btn" onClick={handlePhone}>
                    📱 スマホで対戦（おすすめ）
                  </button>
                  <button className="start-btn secondary" onClick={handleCamera}>
                    📷 カメラで1人
                  </button>
                </div>
              </>
            )}
            {phase === 'loading' && <p>読み込み中...</p>}
            {phase === 'error' && (
              <>
                <p className="error">起動に失敗しました: {errorMsg}</p>
                <button className="start-btn" onClick={() => setPhase('idle')}>
                  戻る
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
