
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Award } from 'lucide-react';
import type { Receipt } from '@/types';
import Link from 'next/link';
import { Button } from '../ui/button';

interface TopCustomersListProps {
  receipts: Receipt[];
  currencySymbol: string;
}

export default function TopCustomersList({ receipts, currencySymbol }: TopCustomersListProps) {
  const customerData = React.useMemo(() => {
    const customerStats: Record<string, { name: string; email: string, sales: number; totalSpent: number }> = {};
    
    receipts.forEach(receipt => {
      if (receipt.customer) {
        const id = receipt.customer.id;
        if (!customerStats[id]) {
          customerStats[id] = { name: receipt.customer.name, email: receipt.customer.email, sales: 0, totalSpent: 0 };
        }
        customerStats[id].sales += 1;
        customerStats[id].totalSpent += receipt.total;
      }
    });

    return Object.entries(customerStats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [receipts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
        <CardDescription>Customers with the highest spending in this period.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {customerData.length > 0 ? (
            <ul className="space-y-3">
              {customerData.map(customer => (
                <li key={customer.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={customer.name}>{customer.name}</p>
                      <p className="text-xs text-muted-foreground truncate" title={customer.email}>{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-primary">{currencySymbol}{customer.totalSpent.toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Award className="h-16 w-16 opacity-50 mb-4" />
                <p className="font-medium">No Customer Data</p>
                <p className="text-sm">Link sales to customers to see this report.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
