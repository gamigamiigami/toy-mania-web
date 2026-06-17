import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { GameEngine } from '../core/GameEngine';
import type { TemplateName } from '../core/types';
import { RemoteHost } from '../net/RemoteHost';
import { TEMPLATE_LIST } from '../stage/templates';

type Phase = 'idle' | 'loading' | 'hostwait' | 'playing' | 'error';

/**
 * GameView (画面側)
 * 責務: DOM要素の用意、操作方法の選択(カメラ/スマホ)、スマホ接続のQR表示、
 *       スコア/状況HUD、テンプレ切替。ロジックは GameEngine に委譲する。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hostRef = useRef<RemoteHost | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('');
  const [template, setTemplate] = useState<TemplateName>('photo');
  const [errorMsg, setErrorMsg] = useState('');
  const [qr, setQr] = useState('');
  const [room, setRoom] = useState('');
  const [ctrlUrl, setCtrlUrl] = useState('');

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      hostRef.current?.dispose();
    };
  }, []);

  const startEngine = async (mode: 'camera' | 'remote') => {
    if (!videoRef.current || !canvasRef.current) return;
    const engine = new GameEngine(videoRef.current, canvasRef.current, mode);
    engine.onScoreChange = setScore;
    engine.onStatusChange = setStatus;
    engineRef.current = engine;
    setTemplate(engine.getTemplateName());
    await engine.start();
    setPhase('playing');
  };

  const handleCamera = async () => {
    setPhase('loading');
    try {
      await startEngine('camera');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const handlePhone = async () => {
    try {
      const host = new RemoteHost();
      hostRef.current = host;
      setRoom(host.code);
      const url = host.controllerUrl();
      setCtrlUrl(url);
      setQr(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
      setPhase('hostwait');
      host.onConnected = async () => {
        host.onAim = (x, y) => engineRef.current?.setRemoteAim(x, y);
        try {
          await startEngine('remote');
        } catch (e) {
          setErrorMsg(e instanceof Error ? e.message : String(e));
          setPhase('error');
        }
      };
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const handleSwitch = (name: TemplateName) => {
    engineRef.current?.setTemplate(name);
    setTemplate(name);
  };

  return (
    <div className="game-root">
      <div className="stage">
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={canvasRef} className="game-canvas" />

        {phase === 'playing' && (
          <>
            <div className="hud">
              <span className="score">SCORE: {score}</span>
              {status && <span className="status">{status}</span>}
            </div>
            <div className="template-bar">
              {TEMPLATE_LIST.map((t) => (
                <button
                  key={t.name}
                  className={t.name === template ? 'tpl active' : 'tpl'}
                  onClick={() => handleSwitch(t.name)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}

        {phase !== 'playing' && (
          <div className="overlay">
            <h1>指差し3Dシューティング</h1>
            <p className="subtitle">Toy Mania風</p>

            {phase === 'idle' && (
              <>
                <p>操作方法を選んでください。</p>
                <div className="mode-row">
                  <button className="start-btn" onClick={handlePhone}>
                    📱 スマホで操作（おすすめ）
                  </button>
                  <button className="start-btn secondary" onClick={handleCamera}>
                    📷 カメラで操作
                  </button>
                </div>
              </>
            )}

            {phase === 'hostwait' && (
              <>
                <p>スマホでQRを読み取り、コントローラを開いてください。</p>
                {qr && <img className="qr" src={qr} alt="QR" />}
                <p className="room">ルーム: <b>{room}</b></p>
                <p className="url">{ctrlUrl}</p>
                <p className="conn">スマホの接続待ち...</p>
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
