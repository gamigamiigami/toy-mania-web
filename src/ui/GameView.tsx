import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import type { TemplateName } from '../core/types';
import { TEMPLATE_LIST } from '../stage/templates';

type Phase = 'idle' | 'loading' | 'playing' | 'error';

/**
 * GameView
 * 責務: DOM要素(video/canvas)の用意、開始操作、スコア/状況HUD、
 *       ステージテンプレートの切替UI。ロジックは GameEngine に委譲する。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('');
  const [template, setTemplate] = useState<TemplateName>('sliders');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    return () => engineRef.current?.stop();
  }, []);

  const handleStart = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setPhase('loading');
    try {
      const engine = new GameEngine(videoRef.current, canvasRef.current);
      engine.onScoreChange = setScore;
      engine.onStatusChange = setStatus;
      engineRef.current = engine;
      setTemplate(engine.getTemplateName());
      await engine.start();
      setPhase('playing');
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
            <p className="subtitle">Toy Mania風 / Phase1 テンプレート検証</p>
            {phase === 'idle' && (
              <>
                <p>
                  人差し指で投擲方向を狙い、奥の3D空間へボールを投げます。
                  0.5秒ごとに自動連射。遠い的ほど重力で落ちるので上を狙います。
                </p>
                <button className="start-btn" onClick={handleStart}>
                  カメラを許可して開始
                </button>
              </>
            )}
            {phase === 'loading' && <p>カメラとモデルを読み込み中...</p>}
            {phase === 'error' && (
              <>
                <p className="error">起動に失敗しました: {errorMsg}</p>
                <button className="start-btn" onClick={handleStart}>
                  再試行
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
