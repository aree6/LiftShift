export { Page };

import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';
import { initGA } from '../../utils/integrations/ga';

const getRouterBasename = (): string => {
  const baseUrl = (import.meta as any).env?.BASE_URL;
  if (typeof baseUrl !== 'string') return '/';
  const trimmed = baseUrl.replace(/\/+$/g, '');
  return trimmed || '/';
};

function Page() {
  useEffect(() => {
    initGA();
  }, []);

  return (
    <BrowserRouter basename={getRouterBasename()}>
      <App />
    </BrowserRouter>
  );
}
