export { Layout };

import React from 'react';
import type { PageContext } from 'vike/types';
import { ThemeProvider } from '../components/ThemeProvider';
import '../tailwind.css';

type LayoutProps = {
  children: React.ReactNode;
  pageContext: PageContext;
};

function Layout({ children }: LayoutProps) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
