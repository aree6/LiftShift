export const initGA = () => {
  const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  const isProd = (import.meta as any).env?.PROD;
  if (!isProd || !id) return;
  if ((window as any).gaInitialized) return;
  (window as any).gaInitialized = true;

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);} 
    gtag('js', new Date());
    gtag('config', '${id}', { send_page_view: false });
  `;
  document.head.appendChild(script2);
};

export const trackPageView = (path: string) => {
  const id = (import.meta as any).env?.VITE_GA_MEASUREMENT_ID;
  const isProd = (import.meta as any).env?.PROD;
  if (!isProd || !id || !(window as any).gtag) return;
  (window as any).gtag('event', 'page_view', { page_path: path });
};
