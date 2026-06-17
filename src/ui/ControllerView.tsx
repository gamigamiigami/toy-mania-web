import { useEffect, useRef, useState } from 'react';
import { ControllerConfig } from '../config/GameConfig';
import { RemoteController } from '../net/RemoteController';

type Status = 'connecting' | 'ready' | 'closed';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * ControllerView (スマホ側)
 * 責務: ジャイロ(DeviceOrientation)で照準を計算し、WebRTCでホスト画面へ送る。
 */
export function ControllerView({ room }: { room: string }) {
  const ctrlRef = useRef<RemoteController | null>(null);
  const neutral = useRef<{ a: number; b: number } | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [active, setActive] = useState(false);

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
      // 左右 = ヨー(alpha:左右に振る)。360度ラップを [-180,180] に補正。
      let da = e.alpha - neutral.current.a;
      da = ((da + 540) % 360) - 180;
      // 上下 = ピッチ(beta:上下に振る)。
      const db = e.beta - neutral.current.b;
      const x = clamp01(0.5 + da * ControllerConfig.sensX * ControllerConfig.signX);
      const y = clamp01(0.5 + db * ControllerConfig.sensY * ControllerConfig.signY);
      ctrlRef.current?.sendAim(x, y);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [active]);

  const start = async () => {
    // iOS はジェスチャ内でセンサー権限が必要。
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
        /* 一部ブラウザは未対応。無視して続行。 */
      }
    }
    neutral.current = null; // 最初の値を中央に
    setActive(true);
  };

  const recenter = () => {
    neutral.current = null;
  };

  return (
    <div className="controller">
      <h1>🎯 コントローラ</h1>
      <p className="room">ルーム: {room}</p>
      <p className="conn">
        {status === 'connecting' && '接続中...'}
        {status === 'ready' && '接続OK'}
        {status === 'closed' && '切断されました'}
      </p>

      {!active ? (
        <>
          <p>スマホを画面に向けて、下のボタンで開始します。</p>
          <button
            className="ctrl-btn"
            onClick={start}
            disabled={status !== 'ready'}
          >
            開始（センサー許可）
          </button>
        </>
      ) : (
        <>
          <p>スマホを傾けて照準を動かします。</p>
          <button className="ctrl-btn" onClick={recenter}>
            中央にセット
          </button>
        </>
      )}
    </div>
  );
}
