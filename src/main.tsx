import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameView } from './ui/GameView';
import './ui/styles.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root が見つかりません');

createRoot(rootEl).render(
  <StrictMode>
    <GameView />
  </StrictMode>,
);
