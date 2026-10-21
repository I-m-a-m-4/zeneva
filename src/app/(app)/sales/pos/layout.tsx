
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePOS } from "@/context/pos-context";
import { isCoreFeatureBlocked } from "@/lib/plan";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  { name: "Select Products", path: "/sales/pos/select-products" },
  { name: "Customer", path: "/sales/pos/customer" },
  { name: "Payment", path: "/sales/pos/payment" },
  { name: "Review", path: "/sales/pos/review" },
];

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex((step) => pathname === step.path);
  const { business } = usePOS();
  const isReadOnly = business ? isCoreFeatureBlocked(business) : false;

  return (
    <div className="px-2 py-6 sm:px-6 sm:py-6 mx-auto w-full max-w-[2000px]">
      {isReadOnly && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/30 bg-destructive/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Trial Expired — POS is in Read-Only Mode</p>
              <p className="text-xs text-muted-foreground">Your 30-day trial or plan has ended. You can view your catalog and cart, but recording new sales requires an active plan.</p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-destructive hover:bg-destructive/90 text-white shrink-0 w-full sm:w-auto">
            <Link href="/billing">Upgrade Plan</Link>
          </Button>
        </div>
      )}
      <nav aria-label="Progress" className="mb-8 no-print">
        <ol role="list" className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li
              key={step.name}
              className={cn(
                stepIdx !== steps.length - 1 ? "pr-16 sm:pr-24" : "",
                "relative"
              )}
            >
              {stepIdx < currentStepIndex ? (
                <>
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="h-0.5 w-full bg-primary" />
                  </div>
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <span className="text-sm">{stepIdx + 1}</span>
                  </div>
                </>
              ) : stepIdx === currentStepIndex ? (
                <>
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="h-0.5 w-full bg-border" />
                  </div>
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                    <span className="text-sm text-primary">{stepIdx + 1}</span>
                  </div>
                  <div className="absolute top-10 text-center text-xs text-primary font-semibold left-1/2 -translate-x-1/2 whitespace-nowrap">{step.name}</div>
                </>
              ) : (
                <>
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="h-0.5 w-full bg-border" />
                  </div>
                  <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-background">
                    <span className="text-sm text-muted-foreground">{stepIdx + 1}</span>
                  </div>
                  <div className="absolute top-10 text-center text-xs text-muted-foreground left-1/2 -translate-x-1/2 whitespace-nowrap">{step.name}</div>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}
