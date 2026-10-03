import React from 'react';
import { usePageContext } from 'vike-react/usePageContext';

const OG_IMAGE = 'https://liftshift.app/UI/logo.png';

export const SOFTWARE_APP_SCHEMA = '{"@context":"https://schema.org","@graph":[{"@type":"SoftwareApplication","name":"LiftShift","applicationCategory":"HealthApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"description":"Free and open source workout analytics dashboard that turns Hevy, Strong, and Lyfta logs into visual training insights. Track volume trends, personal records, muscle heatmaps, and exercise progress locally in your browser.","url":"https://liftshift.app","image":"https://liftshift.app/UI/logo.png","license":"https://github.com/aree6/LiftShift/blob/main/LICENSE"},{"@type":"WebSite","name":"LiftShift","url":"https://liftshift.app","description":"Free and open source workout analytics dashboard. Turn Hevy, Strong, and Lyfta workout logs into beautiful charts and insights.","potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://liftshift.app/?q={search_term_string}"},"query-input":"required name=search_term_string"}}]}';

export type SeoHeadProps = {
  isLanding: boolean;
  title?: string;
  description?: string;
};

const FALLBACK_TITLE = 'LiftShift — Free & Open Source Workout Analytics';
const FALLBACK_DESCRIPTION =
  'Free and open source workout analytics. Import your gym logs from Hevy, Strong, or Lyfta — get muscle heatmaps, plateau detection, set-by-set feedback, and AI-ready exports. Runs in your browser, no account needed.';

export function SeoHead({ isLanding, title, description }: SeoHeadProps) {
  const resolvedTitle = title || FALLBACK_TITLE;
  const resolvedDescription = description || FALLBACK_DESCRIPTION;

  let pathname = '/';
  try {
    const pageContext = usePageContext() as { urlPathname?: string };
    if (typeof pageContext?.urlPathname === 'string' && pageContext.urlPathname) {
      pathname = pageContext.urlPathname;
    }
  } catch {
    // ignore — fall back to site root
  }

  return (
    <>
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="LiftShift" />
      <meta property="og:url" content={`https://liftshift.app${pathname}`} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={OG_IMAGE} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={OG_IMAGE} />

      {isLanding ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: SOFTWARE_APP_SCHEMA }}
        />
      ) : null}
    </>
  );
}
