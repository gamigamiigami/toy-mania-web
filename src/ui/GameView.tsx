import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PlayerConfig } from '../config/GameConfig';
import { GameEngine } from '../core/GameEngine';
import { RemoteHost } from '../net/RemoteHost';

type Phase = 'idle' | 'loading' | 'playing' | 'error';

/**
 * GameView (画面側)
 * 責務: 操作方法の選択、スマホ接続(QR)、2人対戦のHUD(スコア/タイマー/リザルト)。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hostRef = useRef<RemoteHost | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [scores, setScores] = useState<number[]>([0, 0]);
  const [connected, setConnected] = useState<boolean[]>([false, false]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [qr, setQr] = useState('');
  const [room, setRoom] = useState('');
  const [showJoin, setShowJoin] = useState(false);

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
    engine.onRoundOver = (sc) => setResult(sc);
    engine.onRoundStart = () => setResult(null);
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
    try {
      const engine = new GameEngine(videoRef.current, canvasRef.current, 'camera');
      wireEngine(engine);
      engineRef.current = engine;
      setConnected([true, false]);
      await engine.start();
      setPhase('playing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const handlePhone = async () => {
    if (!videoRef.current || !canvasRef.current) return;
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
      setShowJoin(true);
      setPhase('playing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const winnerText = (sc: number[]): string => {
    const a = sc[0] ?? 0;
    const b = sc[1] ?? 0;
    if (!connected[1]) return `スコア ${a}`;
    if (a === b) return '引き分け！';
    return a > b ? `${PlayerConfig.names[0]} の勝ち！` : `${PlayerConfig.names[1]} の勝ち！`;
  };

  return (
    <div className="game-root">
      <div className="stage">
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={canvasRef} className="game-canvas" />

        {phase === 'playing' && (
          <>
            <div className="vs-hud">
              <span className="p p1" style={{ color: PlayerConfig.colors[0] }}>
                {PlayerConfig.names[0]} {scores[0]}
              </span>
              <span className="timer">{timeLeft}</span>
              {connected[1] ? (
                <span className="p p2" style={{ color: PlayerConfig.colors[1] }}>
                  {PlayerConfig.names[1]} {scores[1]}
                </span>
              ) : (
                <span className="p p2 waiting">P2 …</span>
              )}
            </div>

            {showJoin && (
              <div className="join-panel">
                <h2>スマホで参加</h2>
                {qr && <img className="qr" src={qr} alt="QR" />}
                <p className="room">ルーム <b>{room}</b></p>
                <div className="join-chips">
                  <span style={{ color: PlayerConfig.colors[0] }}>
                    {connected[0] ? '● P1 接続' : '○ P1 待ち'}
                  </span>
                  <span style={{ color: PlayerConfig.colors[1] }}>
                    {connected[1] ? '● P2 接続' : '○ P2 待ち'}
                  </span>
                </div>
                <button className="start-btn" onClick={() => setShowJoin(false)}>
                  はじめる
                </button>
              </div>
            )}

            {result && (
              <div className="result-panel">
                <h1>TIME UP!</h1>
                <div className="result-scores">
                  <span style={{ color: PlayerConfig.colors[0] }}>
                    {PlayerConfig.names[0]}: {result[0]}
                  </span>
                  {connected[1] && (
                    <span style={{ color: PlayerConfig.colors[1] }}>
                      {PlayerConfig.names[1]}: {result[1]}
                    </span>
                  )}
                </div>
                <p className="winner">{winnerText(result)}</p>
                <p className="next">まもなく次のステージ…</p>
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
