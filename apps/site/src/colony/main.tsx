import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@adam0white/lab-kit/stage.css';
import '../shared/theme.css';
import './ui/colony.css';
import { App } from './ui/App.tsx';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
