
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Package, Search } from 'lucide-react';
import type { Product, Receipt } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AbcAnalysisProps {
    receipts: Receipt[];
    products: Product[];
    currencySymbol: string;
}

type ProductAnalysis = {
    id: string;
    name: string;
    revenue: number;
    quantity: number;
    orderCount: number;
    cumulativePercent: number;
    class: 'A' | 'B' | 'C';
}

export default function AbcAnalysis({ receipts, products, currencySymbol }: AbcAnalysisProps) {
    const [searchQuery, setSearchQuery] = React.useState('');

    const analysisData = React.useMemo(() => {
        const productRevenue: Record<string, { revenue: number, quantity: number, orderCount: number }> = {};

        receipts.forEach(receipt => {
            const productsInReceipt = new Set(receipt.items.map(i => i.productId));
            productsInReceipt.forEach(pid => {
                if (!productRevenue[pid]) productRevenue[pid] = { revenue: 0, quantity: 0, orderCount: 0 };
                productRevenue[pid].orderCount++;
            });
            receipt.items.forEach(item => {
                if (!productRevenue[item.productId]) {
                    productRevenue[item.productId] = { revenue: 0, quantity: 0, orderCount: 0 };
                }
                productRevenue[item.productId].revenue += item.price * item.quantity;
                productRevenue[item.productId].quantity += item.quantity;
            });
        });

        const totalRevenue = Object.values(productRevenue).reduce((sum, { revenue }) => sum + revenue, 0);

        if (totalRevenue === 0) {
            return { classA: [], classB: [], classC: [], allSearched: [] };
        }

        const sortedProducts = Object.entries(productRevenue)
            .map(([productId, data]) => ({
                id: productId,
                name: products.find(p => p.id === productId)?.name || 'Unknown Product',
                ...data,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        let cumulativeRevenue = 0;
        const classifiedProducts: ProductAnalysis[] = sortedProducts.map(p => {
            cumulativeRevenue += p.revenue;
            const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;
            let productClass: 'A' | 'B' | 'C';
            if (cumulativePercent <= 80) {
                productClass = 'A';
            } else if (cumulativePercent <= 95) {
                productClass = 'B';
            } else {
                productClass = 'C';
            }
            return { ...p, cumulativePercent, class: productClass };
        });

        return {
            classA: classifiedProducts.filter(p => p.class === 'A'),
            classB: classifiedProducts.filter(p => p.class === 'B'),
            classC: classifiedProducts.filter(p => p.class === 'C'),
            allSearched: classifiedProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
        };

    }, [receipts, products, searchQuery]);

    const { classA, classB, classC, allSearched } = analysisData;
    const hasData = classA.length > 0 || classB.length > 0 || classC.length > 0;

    return (
        <Card className="border-primary/5">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className='flex items-center gap-2'><BarChart className="h-5 w-5 text-primary" /> Inventory Velocity & ABC Analysis</CardTitle>
                        <CardDescription>
                            Categorizes products based on their revenue contribution.
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
                        <Input
                            placeholder="Search product class..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {hasData ? (
                    <Tabs defaultValue={searchQuery ? "search" : "classA"}>
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="search" disabled={!searchQuery}>Search {searchQuery && `(${allSearched.length})`}</TabsTrigger>
                            <TabsTrigger value="classA">Class A ({classA.length})</TabsTrigger>
                            <TabsTrigger value="classB">Class B ({classB.length})</TabsTrigger>
                            <TabsTrigger value="classC">Class C ({classC.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="search">
                            <CategoryTable products={allSearched} currencySymbol={currencySymbol} />
                        </TabsContent>
                        <TabsContent value="classA">
                            <CategoryTable products={classA} currencySymbol={currencySymbol} />
                        </TabsContent>
                        <TabsContent value="classB">
                            <CategoryTable products={classB} currencySymbol={currencySymbol} />
                        </TabsContent>
                        <TabsContent value="classC">
                            <CategoryTable products={classC} currencySymbol={currencySymbol} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="mx-auto h-12 w-12 opacity-50" />
                        <h3 className="mt-4 text-lg font-medium">Not Enough Sales Data</h3>
                        <p className="mt-2 max-w-md mx-auto">This report will be generated once you have more sales records to analyze.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CategoryTable({ products, currencySymbol }: { products: ProductAnalysis[], currencySymbol: string }) {
    if (products.length === 0) {
        return <div className="text-center text-muted-foreground py-10">No products found.</div>
    }
    return (
        <ScrollArea className="h-[400px]">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Qty Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-center">Class</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(p => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant="secondary" className="font-mono">{p.orderCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{p.quantity}</TableCell>
                            <TableCell className="text-right font-semibold">{currencySymbol}{p.revenue.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={p.class === 'A' ? 'default' : p.class === 'B' ? 'secondary' : 'outline'} className={p.class === 'A' ? 'bg-primary' : ''}>
                                    {p.class}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
