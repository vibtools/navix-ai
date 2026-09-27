import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './components/Sidebar.jsx';
import Terms from './components/Terms.jsx';
import { AppStorage } from './core/appStorage.js';
import './index.css';

function App() {
  const [agreed, setAgreed] = useState(null);

  useEffect(() => {
    AppStorage.get(['termsAgreed']).then(result => {
      setAgreed(Boolean(result.termsAgreed));
    });
  }, []);

  if (agreed === null) {
    return <div className="h-full w-full bg-slate-50 flex items-center justify-center text-slate-400 text-[13px]">Loading...</div>;
  }

  if (!agreed) {
    return (
      <Terms onAccept={() => {
        AppStorage.set({ termsAgreed: true }).then(() => {
          setAgreed(true);
        });
      }} />
    );
  }

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
