import React from 'react';

// Single combined Google Fonts request so the hero fancy font starts loading
// with HTML parse (in parallel with the JS bundle) instead of after React renders.
// Must match <link rel="stylesheet"> href exactly for the preload to hit.
const FONT_CSS_HREF =
  'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400..700;1,400..700&family=Nunito:ital,wght@0,200..1000;1,200..1000&family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';

export function CommonHead() {
  const baseUrl = import.meta.env.BASE_URL;
  const base = typeof baseUrl === 'string' ? baseUrl : '/';
  const withBase = (path: string) => `${base}${path.replace(/^\/+/, '')}`;

  return (
    <>
      <link rel="icon" href={withBase('favicon.ico')} />
      <link rel="icon" href={withBase('favicon.png')} type="image/png" sizes="48x48" />
      <link rel="shortcut icon" href={withBase('favicon.ico')} />
      <link rel="apple-touch-icon" href={withBase('UI/logo.png')} sizes="180x180" />

      <script dangerouslySetInnerHTML={{
        __html: `
    (function () {
      try {
        var key = 'hevy_analytics_theme_mode';
        var stored = localStorage.getItem(key);
        var mode =
          stored === 'light' || stored === 'medium-dark' || stored === 'midnight-dark' || stored === 'pure-black'
            ? stored
            : 'pure-black';
        document.documentElement.dataset.theme = mode;
        document.documentElement.style.colorScheme = mode === 'light' ? 'light' : 'dark';
      } catch (e) {}
    })();
  ` }} />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preload" as="style" href={FONT_CSS_HREF} />
      <link href={FONT_CSS_HREF} rel="stylesheet" />
      <script dangerouslySetInnerHTML={{
        __html: `
        try {
          var font = localStorage.getItem('hevy_analytics_font_choice');
          if (!font || !['original', 'loraItalic', 'nunito'].includes(font)) font = 'nunito';
          document.documentElement.dataset.font = font;
        } catch(e) {}
      ` }} />
    </>
  );
}
