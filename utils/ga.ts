export const initGA = () => {
  const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  const isProd = (import.meta as any).env?.PROD;
  if (!isProd || !id) return;
  if ((window as any).gaInitialized) return;
  (window as any).gaInitialized = true;

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = (window as any).gtag || function () {
    (window as any).dataLayer.push(arguments);
  };

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script1);

  (window as any).gtag('js', new Date());
  (window as any).gtag('config', id, { send_page_view: false });
};

export const trackPageView = (path: string) => {
  const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  const isProd = (import.meta as any).env?.PROD;
  if (!isProd || !id || typeof (window as any).gtag !== 'function') return;
  (window as any).gtag('event', 'page_view', {
    page_title: document.title,
    page_location: `${window.location.origin}${path}`,
    page_path: path,
  });
};
