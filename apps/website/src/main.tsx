import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { App } from './App';
import { DeeplinkPage } from './pages/DeeplinkPage';
import { HomePage } from './pages/HomePage';

import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path=":action" element={<DeeplinkPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
