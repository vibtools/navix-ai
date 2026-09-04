import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './sidebar/Sidebar.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sidebar />
  </React.StrictMode>
);
