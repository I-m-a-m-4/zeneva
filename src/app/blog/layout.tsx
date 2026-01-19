import MarketingFooter from "@/components/layout/marketing-footer";
import MarketingHeader from "@/components/layout/marketing-header";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main className="pt-24">{children}</main>
      <MarketingFooter />
    </>
  );
}
