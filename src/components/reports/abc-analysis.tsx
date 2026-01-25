
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Package } from 'lucide-react';
import type { Product, Receipt } from '@/types';

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
    cumulativePercent: number;
    class: 'A' | 'B' | 'C';
}

export default function AbcAnalysis({ receipts, products, currencySymbol }: AbcAnalysisProps) {
    const analysisData = React.useMemo(() => {
        const productRevenue: Record<string, { revenue: number, quantity: number }> = {};
        
        receipts.forEach(receipt => {
            receipt.items.forEach(item => {
                if (!productRevenue[item.productId]) {
                    productRevenue[item.productId] = { revenue: 0, quantity: 0 };
                }
                productRevenue[item.productId].revenue += item.price * item.quantity;
                productRevenue[item.productId].quantity += item.quantity;
            });
        });

        const totalRevenue = Object.values(productRevenue).reduce((sum, { revenue }) => sum + revenue, 0);

        if (totalRevenue === 0) {
            return { classA: [], classB: [], classC: [] };
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
        };

    }, [receipts, products]);

    const { classA, classB, classC } = analysisData;
    const hasData = classA.length > 0 || classB.length > 0 || classC.length > 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'><BarChart/> Inventory Velocity & ABC Analysis</CardTitle>
                <CardDescription>
                    Categorizes products based on their revenue contribution. Class A items are your most valuable products.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {hasData ? (
                    <Tabs defaultValue="classA">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="classA">Class A ({classA.length})</TabsTrigger>
                            <TabsTrigger value="classB">Class B ({classB.length})</TabsTrigger>
                            <TabsTrigger value="classC">Class C ({classC.length})</TabsTrigger>
                        </TabsList>
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
        return <div className="text-center text-muted-foreground py-10">No products in this class.</div>
    }
    return (
        <ScrollArea className="h-72">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Quantity Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-right">{p.quantity}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{p.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
