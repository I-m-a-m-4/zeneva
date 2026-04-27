
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, Users, Menu, FileText, LifeBuoy, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
}

interface MobileBottomNavProps {
    navItems: NavItem[];
    moreNavItems: NavItem[];
    isLoading?: boolean;
}

export default function MobileBottomNav({ navItems, moreNavItems, isLoading }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-background/95 backdrop-blur-md border-t border-border z-40 md:hidden no-print">
      <div className="flex justify-around items-center h-16">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center justify-center flex-1 h-full">
              <Skeleton className="h-6 w-6 mb-1 rounded-md" />
              <Skeleton className="h-3 w-12 rounded-sm" />
            </div>
          ))
        ) : (
          navItems.map((item) => {
            const isActive = (item.href === '/dashboard' && pathname === item.href) || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center flex-1 h-full">
                <item.icon className={cn('h-6 w-6 mb-1', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('text-xs', isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </Link>
            );
          })
        )}

        {!isLoading && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full">
                <Menu className='h-6 w-6 mb-1 text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60%] flex flex-col">
              <SheetHeader>
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                  <ul className="space-y-1 py-4">
                      {moreNavItems.map(item => {
                          const isActive = pathname.startsWith(item.href);
                          return (
                              <li key={item.href}>
                                  <Link
                                      href={item.href}
                                      onClick={() => setIsSheetOpen(false)}
                                      className={cn(
                                          "flex items-center gap-4 p-3 rounded-lg text-base",
                                          isActive ? "bg-muted text-primary font-semibold" : "text-foreground"
                                      )}
                                  >
                                      <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                                      <span>{item.label}</span>
                                  </Link>
                              </li>
                          )
                      })}
                  </ul>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
