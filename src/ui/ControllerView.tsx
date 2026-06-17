import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { ControllerConfig } from '../config/GameConfig';
import { RemoteController } from '../net/RemoteController';

type Status = 'connecting' | 'ready' | 'closed';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** スワイプ描画用 (viewBox 0..100 のローカル座標)。 */
interface Drag {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
}

/**
 * ControllerView (スマホ側)
 * 責務: ジャイロで照準、スワイプで発射(直進/カーブ)。おもちゃ箱風UI。
 */
export function ControllerView({ room }: { room: string }) {
  const ctrlRef = useRef<RemoteController | null>(null);
  const neutral = useRef<{ a: number; b: number } | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [active, setActive] = useState(false);
  const [shots, setShots] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = new RemoteController(room);
    c.onOpen = () => setStatus('ready');
    c.onClosed = () => setStatus('closed');
    ctrlRef.current = c;
    return () => c.dispose();
  }, [room]);

  useEffect(() => {
    if (!active) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      if (!neutral.current) neutral.current = { a: e.alpha, b: e.beta };
      let da = e.alpha - neutral.current.a;
      da = ((da + 540) % 360) - 180;
      const db = e.beta - neutral.current.b;
      const x = clamp01(0.5 + da * ControllerConfig.sensX * ControllerConfig.signX);
      const y = clamp01(0.5 + db * ControllerConfig.sensY * ControllerConfig.signY);
      ctrlRef.current?.sendAim(x, y);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [active]);

  const start = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          alert('センサーの使用を許可してください');
          return;
        }
      } catch {
        /* 未対応ブラウザは無視 */
      }
    }
    neutral.current = null;
    setActive(true);
  };

  const recenter = () => {
    neutral.current = null;
  };

  const local = (e: TouchEvent, clientX: number, clientY: number): Drag => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    return { sx: x, sy: y, cx: x, cy: y };
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY };
    setDrag(local(e, t.clientX, t.clientY));
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!swipeStart.current) return;
    const t = e.touches[0];
    const r = e.currentTarget.getBoundingClientRect();
    const cx = ((t.clientX - r.left) / r.width) * 100;
    const cy = ((t.clientY - r.top) / r.height) * 100;
    setDrag((d) => (d ? { ...d, cx, cy } : null));
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = swipeStart.current;
    swipeStart.current = null;
    setDrag(null);
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (-dy < ControllerConfig.swipeMinDist) return;
    const curve = clamp(dx / -dy, -1, 1);
    ctrlRef.current?.sendFire(curve);
    setShots((n) => n + 1);
  };

  // スワイプ中の直進度 (カーブが小さいほど緑)。
  const straightish =
    drag && Math.abs(drag.cx - drag.sx) < Math.abs(drag.sy - drag.cy) * 0.22;

  return (
    <div className="controller">
      <div className="ctrl-head">
        <h1>🎪 まとあて</h1>
        <p className="conn">
          {status === 'connecting' && '接続中…'}
          {status === 'ready' && `接続OK ・ ルーム ${room}`}
          {status === 'closed' && '切断されました'}
        </p>
      </div>

      {!active ? (
        <div className="ctrl-center">
          <p>スマホを画面に向けて開始してね</p>
          <button className="ctrl-btn" onClick={start} disabled={status !== 'ready'}>
            ▶ 開始（センサー許可）
          </button>
        </div>
      ) : (
        <>
          <p className="hint">まっすぐ＝直進 ／ ななめ＝カーブ</p>
          <div
            className="swipe-pad"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <svg className="guide" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* まっすぐ基準ライン (ボールから上へ) */}
              <line
                x1="50"
                y1="88"
                x2="50"
                y2="10"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
              <polygon points="50,5 47,12 53,12" fill="rgba(255,255,255,0.55)" />
              {/* スワイプ中の方向ライン */}
              {drag && (
                <line
                  x1={drag.sx}
                  y1={drag.sy}
                  x2={drag.cx}
                  y2={drag.cy}
                  stroke={straightish ? '#39d353' : '#ff9f0a'}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
            <div className="ball" />
            <span className="swipe-label">⬆ スワイプで発射</span>
          </div>
          <div className="ctrl-actions">
            <button className="ctrl-btn small" onClick={recenter}>
              ◎ 中央にセット
            </button>
            <span className="shots">🎯 {shots}</span>
          </div>
        </>
      )}
    </div>
  );
}
