import React from 'react';
import { createRoot } from 'react-dom/client';
import MarkmapHooks from './markmap-hooks';
import 'antd/dist/reset.css';
import './style.css';

function App() {
  return (
    <div className="flex flex-row h-screen">
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
