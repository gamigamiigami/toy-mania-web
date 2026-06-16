import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../core/GameEngine';

type Phase = 'idle' | 'loading' | 'playing' | 'error';

/**
 * GameView
 * 責務: DOM 要素 (video / canvas) の用意、開始操作、スコア HUD の表示。
 *       ゲームロジックは GameEngine に委譲する。
 */
export function GameView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
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
      engineRef.current = engine;
      await engine.start();
      setPhase('playing');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  return (
    <div className="game-root">
      <div className="stage">
        {/* 映像取得用。表示は canvas 側で行うため隠す。 */}
        <video ref={videoRef} playsInline muted className="hidden-video" />
        <canvas ref={canvasRef} className="game-canvas" />

        {phase === 'playing' && (
          <div className="hud">SCORE: {score}</div>
        )}

        {phase !== 'playing' && (
          <div className="overlay">
            <h1>指差しシューティング</h1>
            <p className="subtitle">技術検証版 (MediaPipe Hand Tracking)</p>
            {phase === 'idle' && (
              <>
                <p>
                  人差し指で照準を動かします。0.5秒ごとに自動連射され、
                  黄色いターゲットに当てるとスコアが入ります。
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
