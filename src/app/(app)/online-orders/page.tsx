
'use client';

import * as React from 'react';
import { usePOS } from '@/context/pos-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { OnlineOrder } from '@/types';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Globe, MoreHorizontal, CheckCircle, Clock, Info, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import RefreshButton from '@/components/shared/refresh-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function OrderRowSkeleton() {
    return (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 text-center" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
             <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
        </TableRow>
    )
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    pending: 'secondary',
    paid: 'default',
    shipped: 'outline',
    cancelled: 'destructive',
}

export default function OnlineOrdersPage() {
    const { business, isLoading: isPosLoading, currencySymbol } = usePOS();
    const firestore = useFirestore();
    const { toast } = useToast();

    const onlineOrdersQuery = useMemoFirebase(
        () => business?.id ? query(collection(firestore, 'businessInstances', business.id, 'onlineOrders'), orderBy('createdAt', 'desc')) : null,
        [business?.id, firestore]
    );

    const { data: onlineOrders, isLoading: isLoadingOrders } = useCollection<OnlineOrder>(onlineOrdersQuery);
    const isLoading = isPosLoading || isLoadingOrders;
    
    const handleStatusChange = async (orderId: string, status: OnlineOrder['status']) => {
        if (!business?.id) return;
        const orderRef = doc(firestore, 'businessInstances', business.id, 'onlineOrders', orderId);
        try {
            await updateDoc(orderRef, { status });
            toast({
                variant: 'success',
                title: 'Order Status Updated',
                description: `Order has been marked as ${status}.`,
            });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update order status.',
            });
        }
    };

    return (
        <div className="space-y-6">
            <PageTitle title="Online Orders" subtitle="Manage incoming orders from your public storefront." />
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                         <div>
                            <CardTitle className="flex items-center gap-2"><Globe /> Incoming Orders</CardTitle>
                            <CardDescription>A log of all orders placed through your public store.</CardDescription>
                         </div>
                         <RefreshButton />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <OrderRowSkeleton />
                                <OrderRowSkeleton />
                                <OrderRowSkeleton />
                            </TableBody>
                        </Table>
                    ) : onlineOrders && onlineOrders.length > 0 ? (
                        <TooltipProvider>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {onlineOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-mono text-xs">{order.id.substring(0,8)}...</TableCell>
                                        <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                                            <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                                            <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{order.customerAddress}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[order.status]} className="capitalize">{order.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="cursor-default flex items-center gap-1.5">
                                                        <Info className="h-3 w-3"/>
                                                        {order.items.length} item(s)
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <ul>
                                                        {order.items.map(item => (
                                                            <li key={item.productId} className="text-sm">{item.quantity} x {item.name}</li>
                                                        ))}
                                                    </ul>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{currencySymbol}{order.total.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                                    <DropdownMenuItem onSelect={() => handleStatusChange(order.id, 'paid')}><CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Mark as Paid</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleStatusChange(order.id, 'pending')}><Clock className="mr-2 h-4 w-4 text-amber-500"/> Mark as Pending</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleStatusChange(order.id, 'cancelled')} className="text-destructive"><XCircle className="mr-2 h-4 w-4"/> Cancel Order</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TooltipProvider>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                            <Globe className="h-12 w-12 text-muted-foreground/50" />
                            <h3 className="text-xl font-semibold mt-4">No Online Orders Yet</h3>
                            <p className="text-muted-foreground mt-2">Enable and share your public store to start receiving orders.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
