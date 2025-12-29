import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initGA } from './utils/integrations/ga';
import { ThemeProvider } from './components/ThemeProvider';
import './tailwind.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

initGA();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);