import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameVersion } from '../shared/GameVersion.tsx';
import '../shared/theme.css';
import '@adam0white/lab-kit/stage.css';
import './ui/watch.css';
import { App } from './ui/App.tsx';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <aside className="game-release">
        <GameVersion id="watch" />
      </aside>
      <App />
    </StrictMode>,
  );
}
