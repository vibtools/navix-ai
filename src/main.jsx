import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './components/Sidebar.jsx';
import './index.css';

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
