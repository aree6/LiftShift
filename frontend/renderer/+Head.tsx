export { Head };

import React from 'react';
import type { PageContext } from 'vike/types';

function Head() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      <style>{`
        /* Italic text styling with Libre Baskerville */
        em, i, [class*="italic"] {
          font-family: "Libre Baskerville", "Poppins", sans-serif !important;
          font-weight: 600;
          font-style: italic;
        }
      `}</style>
    </>
  );
}
