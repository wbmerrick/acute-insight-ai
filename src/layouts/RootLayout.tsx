import { Helmet } from '@dr.pogodin/react-helmet';
import { type ReactElement } from 'react';
import { ScrollRestoration, useLocation } from 'react-router';

import HomepageSameAsJsonLd from '@/components/HomepageSameAsJsonLd';
import Footer from '@/layouts/parts/Footer';
import Header from '@/layouts/parts/Header';
import Website from '@/layouts/Website';

/**
 * Root layout component that wraps all pages with consistent header and footer.
 *
 * Focused, full-screen task flows (the intake, and the signed-in dashboards)
 * bring their own chrome and manage their own full-height layout, so the
 * marketing header and footer are suppressed on those routes — otherwise the
 * fixed marketing header overlaps their content.
 *
 * To customize the header or footer, directly edit the Header.tsx and Footer.tsx
 * files in the layouts/parts directory.
 */
interface RootLayoutProps {
  children: ReactElement;
}

const STANDALONE_PREFIXES = ['/intake', '/portal', '/provider', '/admin'];

export default function RootLayout({ children }: RootLayoutProps) {
  const { pathname } = useLocation();
  const standalone = STANDALONE_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <Website>
      <Helmet>
        <title>Acute Insight AI</title>
        <meta name="description" content="Acute Insight AI" />
      </Helmet>
      <HomepageSameAsJsonLd />
      <ScrollRestoration />
      {!standalone && <Header />}
      {children}
      {!standalone && <Footer />}
    </Website>
  );
}
