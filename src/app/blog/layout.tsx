'use client';

import MarketingFooter from "@/components/layout/marketing-footer";
import MarketingHeader from "@/components/layout/marketing-header";
import { ThemeProvider } from "@/components/theme-provider";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider forcedTheme="light">
      <MarketingHeader />
      <main className="pt-24">{children}</main>
      <MarketingFooter />
    </ThemeProvider>
  );
}
