import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './sidebar/Sidebar.jsx';

function App() {
  return <Sidebar />;
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
