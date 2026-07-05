import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PlayerConfig, RankConfig, STAGE_INFO } from '../config/GameConfig';
import { GameEngine, type PlayerResult } from '../core/GameEngine';
import { RemoteHost } from '../net/RemoteHost';

type Phase = 'idle' | 'loading' | 'playing' | 'error';
type MatchPhase = 'waiting' | 'playing' | 'finished';

/** 命中率からランク称号を決める。 */
function rankTitle(accuracy: number): string {
  for (const r of RankConfig.ranks) {
    if (accuracy >= r.minAccuracy) return r.title;
  }
  return RankConfig.ranks[RankConfig.ranks.length - 1].title;
}

/** ハイスコアの読み書き (localStorage)。 */
function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(RankConfig.highScoreKey)) || 0;
  } catch {
    return 0;
  }
}
function saveHighScore(score: number): void {
  try {
    localStorage.setItem(RankConfig.highScoreKey, String(score));
  } catch {
    /* プライベートモード等では保存しない */
  }
}

/**
 * GameView (画面側)
 * 責務: 操作方法の選択、スマホ接続(QR)、開始の手動管理、HUD、リザルト表示。
 *       描画は WebGL キャンバス + HUD オーバーレイキャンバスの2枚重ね。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const [netError, setNetError] = useState('');
  const [stageLabel, setStageLabel] = useState('');
  const [durationSec, setDurationSec] = useState(30);
  const [transitionSec, setTransitionSec] = useState(2.5);
  const [spin, setSpin] = useState<'' | 'a' | 'b'>('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [highScore, setHighScore] = useState(() => loadHighScore());
  const [isNewRecord, setIsNewRecord] = useState(false);
  const spinToggle = useRef(false);
  const firstStage = useRef(true);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      hostRef.current?.dispose();
    };
  }, []);

  const wireEngine = (engine: GameEngine) => {
    // デバッグ/テスト用フック (コンソールから操作できる)。
    (window as unknown as { __engine?: GameEngine }).__engine = engine;
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
    engine.onRoundStart = () => {
      setResults([]);
      setIsNewRecord(false);
      setMatchPhase('playing');
    };
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
    engine.onGameOver = (res) => {
      setResults(res);
      setMatchPhase('finished');
      const best = Math.max(0, ...res.map((r) => r.score));
      setHighScore((prev) => {
        if (best > prev) {
          saveHighScore(best);
          setIsNewRecord(true);
          return best;
        }
        return prev;
      });
    };
    engine.onPlayerConnected = (id) =>
      setConnected((arr) => {
        const next = [...arr];
        next[id] = true;
        return next;
      });
  };

  const createEngine = (mode: 'camera' | 'remote'): GameEngine | null => {
    if (!videoRef.current || !glCanvasRef.current || !overlayCanvasRef.current)
      return null;
    return new GameEngine(
      videoRef.current,
      glCanvasRef.current,
      overlayCanvasRef.current,
      mode,
    );
  };

  const handleCamera = async () => {
    setPhase('loading');
    setIsPhone(false);
    try {
      const engine = createEngine('camera');
      if (!engine) return;
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
    setIsPhone(true);
    setNetError('');
    try {
      const engine = createEngine('remote');
      if (!engine) return;
      wireEngine(engine);
      engineRef.current = engine;

      const host = new RemoteHost();
      hostRef.current = host;
      host.onReady = async () => {
        setRoom(host.roomLabel());
        setQr(await QRCode.toDataURL(host.controllerUrl(), { width: 220, margin: 1 }));
        setNetError('');
      };
      host.onError = (t) =>
        setNetError(`接続準備に失敗: ${t}。再接続を押してください`);
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

  const reconnect = () => {
    hostRef.current?.dispose();
    setQr('');
    setRoom('');
    setNetError('再接続中…');
    const host = new RemoteHost();
    hostRef.current = host;
    host.onReady = async () => {
      setRoom(host.roomLabel());
      setQr(await QRCode.toDataURL(host.controllerUrl(), { width: 220, margin: 1 }));
      setNetError('');
    };
    host.onError = (t) => setNetError(`接続準備に失敗: ${t}`);
    host.onConnected = (id) => engineRef.current?.connectPlayer(id);
    host.onAim = (id, x, y) => engineRef.current?.setRemoteAim(id, x, y);
    host.onFire = (id, curve) => engineRef.current?.fire(id, curve);
    host.onClosed = (id) =>
      setConnected((arr) => {
        const next = [...arr];
        next[id] = false;
        return next;
      });
  };

  const startMatch = () => engineRef.current?.startMatch();
  const selectStage = (i: number) => {
    setMatchPhase('playing');
    setResults([]);
    engineRef.current?.selectStage(i);
  };
  const changeDuration = (sec: number) => {
    const v = Math.max(3, Math.round(sec) || 0);
    setDurationSec(v);
    engineRef.current?.setDuration(v);
  };

  // テストプレイ用: 数字キー 1-7 でステージ即切替。
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

  const topResult = results.length
    ? results.reduce((a, b) => (b.score > a.score ? b : a))
    : null;

  return (
    <div className="game-root">
      <div
        className={stageCls}
        style={{ animationDuration: `${transitionSec}s` }}
        onAnimationEnd={() => setSpin('')}
      >
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={glCanvasRef} className="game-canvas" />
        <canvas ref={overlayCanvasRef} className="game-canvas overlay-canvas" />

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

            {/* テストプレイ用: ステージ即切替 (数字キー1-7でも可) */}
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
                {stageLabel && <p className="stage-name">最初のシーン: {stageLabel}</p>}
                {isPhone && qr && <img className="qr" src={qr} alt="QR" />}
                {isPhone && !qr && !netError && (
                  <p className="hint-small">接続準備中… QRを生成しています</p>
                )}
                {isPhone && netError && (
                  <>
                    <p className="error">{netError}</p>
                    <button className="ctrl-btn small" onClick={reconnect}>
                      再接続
                    </button>
                  </>
                )}
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
                    <span>1シーンの時間(秒)</span>
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
                {highScore > 0 && (
                  <p className="hint-small">ハイスコア: {highScore}</p>
                )}
                <button
                  className="start-btn"
                  onClick={startMatch}
                  disabled={!canStart}
                >
                  ▶ ライドスタート（全{STAGE_INFO.length}シーン）
                </button>
                {isPhone && !canStart && (
                  <p className="hint-small">スマホが1台つながると開始できます</p>
                )}
              </div>
            )}

            {matchPhase === 'finished' && (
              <div className="join-panel result-panel">
                <h2>🎉 リザルト</h2>
                {isNewRecord && <p className="new-record">✨ ニューレコード！</p>}
                <table className="result-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>スコア</th>
                      <th>命中率</th>
                      <th>ランク</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        className={topResult && r.id === topResult.id ? 'winner' : ''}
                      >
                        <td style={{ color: r.color }}>
                          {topResult && r.id === topResult.id && results.length > 1
                            ? '👑 '
                            : ''}
                          {r.name}
                        </td>
                        <td className="num">{r.score}</td>
                        <td className="num">
                          {Math.round(r.accuracy * 100)}%
                          <span className="sub">
                            ({r.hits}/{r.shots})
                          </span>
                        </td>
                        <td>{rankTitle(r.accuracy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="hint-small">ハイスコア: {highScore}</p>
                <button className="start-btn" onClick={startMatch}>
                  ↻ もう一度あそぶ
                </button>
              </div>
            )}
          </>
        )}

        {phase !== 'playing' && (
          <div className="overlay">
            <h1>トイマニア・ウェブ</h1>
            <p className="subtitle">カーニバル 3D シューティングライド ・ 最大4人</p>
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
