import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { initGA } from './utils/integrations/ga';
import { ThemeProvider } from './components/ThemeProvider';
import './tailwind.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

initGA();

const getRouterBasename = (): string => {
  const baseUrl = (import.meta as any).env?.BASE_URL;
  if (typeof baseUrl !== 'string') return '/';
  const trimmed = baseUrl.replace(/\/+$/g, '');
  return trimmed || '/';
};

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={getRouterBasename()}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);