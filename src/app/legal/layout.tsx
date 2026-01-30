
'use client';

import MarketingFooter from "@/components/layout/marketing-footer";
import MarketingHeader from "@/components/layout/marketing-header";
import { ThemeProvider } from "@/components/theme-provider";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider forcedTheme="light">
      <MarketingHeader />
      <main className="bg-white text-foreground">
        <div className="container mx-auto px-6 py-24 md:py-32">
             <div className="prose lg:prose-lg dark:prose-invert max-w-4xl mx-auto">
                {children}
             </div>
        </div>
      </main>
      <MarketingFooter />
    </ThemeProvider>
  );
}
