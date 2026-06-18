import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PlayerConfig, STAGE_INFO } from '../config/GameConfig';
import { GameEngine } from '../core/GameEngine';
import { RemoteHost } from '../net/RemoteHost';

type Phase = 'idle' | 'loading' | 'playing' | 'error';
type MatchPhase = 'waiting' | 'playing';

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
  const [combos, setCombos] = useState<number[]>(() =>
    PlayerConfig.colors.map(() => 0),
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [qr, setQr] = useState('');
  const [room, setRoom] = useState('');
  const [stageLabel, setStageLabel] = useState('');
  const [durationSec, setDurationSec] = useState(30);
  const [transitionSec, setTransitionSec] = useState(2.5);
  const [spin, setSpin] = useState<'' | 'a' | 'b'>('');
  const spinToggle = useRef(false);
  const firstStage = useRef(true);

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
    engine.onCombo = (id, c) =>
      setCombos((arr) => {
        const next = [...arr];
        next[id] = c;
        return next;
      });
    engine.onRoundStart = () => setMatchPhase('playing');
    engine.onStage = (label) => {
      setStageLabel(label);
      if (firstStage.current) {
        firstStage.current = false;
        return;
      }
      // ステージ移動のトランジション (A/B交互で再生し直す)。
      setSpin(spinToggle.current ? 'a' : 'b');
      spinToggle.current = !spinToggle.current;
    };
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
  const selectStage = (i: number) => engineRef.current?.selectStage(i);
  const changeDuration = (sec: number) => {
    const v = Math.max(3, Math.round(sec) || 0);
    setDurationSec(v);
    engineRef.current?.setDuration(v);
  };

  // テストプレイ用: 数字キー 1-4 でステージ即切替。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= STAGE_INFO.length) selectStage(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ids = PlayerConfig.names.map((_, i) => i);
  const canStart = isPhone ? connected.some((c) => c) : true;

  const stageCls =
    spin === 'a' ? 'stage spin-a' : spin === 'b' ? 'stage spin-b' : 'stage';

  return (
    <div className="game-root">
      <div
        className={stageCls}
        style={{ animationDuration: `${transitionSec}s` }}
        onAnimationEnd={() => setSpin('')}
      >
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
                      {combos[id] >= 2 && (
                        <em className="combo">🔥{combos[id]}</em>
                      )}
                    </span>
                  ) : null,
                )}
              </div>
              <span className="timer">{timeLeft}</span>
              {stageLabel && <span className="stage-chip">{stageLabel}</span>}
            </div>

            {/* テストプレイ用: ステージ即切替 (数字キー1-4でも可) */}
            <div className="stage-switch">
              {STAGE_INFO.map((s, i) => (
                <button
                  key={s.name}
                  className={s.label === stageLabel ? 'tpl active' : 'tpl'}
                  onClick={() => selectStage(i)}
                >
                  {i + 1}. {s.label}
                </button>
              ))}
            </div>

            {matchPhase === 'waiting' && (
              <div className="join-panel">
                <h2>{isPhone ? 'スマホで参加 → スタート' : '準備OK？'}</h2>
                {stageLabel && <p className="stage-name">ステージ: {stageLabel}</p>}
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
                <div className="settings">
                  <label className="set-row">
                    <span>1ステージの時間(秒)</span>
                    <input
                      type="number"
                      min={3}
                      value={durationSec}
                      onChange={(e) => changeDuration(Number(e.target.value))}
                    />
                  </label>
                  <label className="set-row">
                    <span>切替の長さ(秒)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={transitionSec}
                      onChange={(e) =>
                        setTransitionSec(Math.max(0, Number(e.target.value) || 0))
                      }
                    />
                  </label>
                </div>
                <button
                  className="start-btn"
                  onClick={startMatch}
                  disabled={!canStart}
                >
                  ▶ スタート（{durationSec}秒で巡回）
                </button>
                {isPhone && !canStart && (
                  <p className="hint-small">スマホが1台つながると開始できます</p>
                )}
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
