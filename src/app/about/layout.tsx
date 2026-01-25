
import MarketingFooter from "@/components/layout/marketing-footer";
import MarketingHeader from "@/components/layout/marketing-header";

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </>
  );
}
