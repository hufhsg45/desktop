import React from 'react';
import { createRoot } from 'react-dom/client';
import MarkmapHooks from './markmap-hooks';
import './style.css';

function App() {
  return (
    <div className="flex flex-row h-screen p-2">
      <MarkmapHooks />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
