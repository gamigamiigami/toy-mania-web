import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameView } from './ui/GameView';
import { ControllerView } from './ui/ControllerView';
import './ui/styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root が見つかりません');

// URL に ?role=controller&room=XXXX があればスマホ用コントローラを表示。
const params = new URLSearchParams(location.search);
const isController = params.get('role') === 'controller';
const room = params.get('room') ?? '';

createRoot(rootEl).render(
  <StrictMode>
    {isController && room ? <ControllerView room={room} /> : <GameView />}
  </StrictMode>,
);
