
"use client"

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { PieChart as PieChartIcon } from "lucide-react";
import type { Product } from '@/types';

const chartConfig = {
  electronics: { label: "Electronics", color: "hsl(var(--chart-1))" },
  apparel: { label: "Apparel", color: "hsl(var(--chart-2))" },
  accessories: { label: "Accessories", color: "hsl(var(--chart-3))" },
  "home-goods": { label: "Home Goods", color: "hsl(var(--chart-4))" },
  office: { label: "Office", color: "hsl(var(--chart-5))" },
  other: { label: "Other", color: "hsl(var(--muted))" },
} satisfies ChartConfig;

interface CategoryPieChartProps {
  products: Product[];
}

export default function CategoryPieChart({ products }: CategoryPieChartProps) {
  const chartData = React.useMemo(() => {
    if (!products) return [];

    const categoryCounts: Record<string, number> = {};
    products.forEach(product => {
      const categoryKey = product.category?.toLowerCase() || 'other';
      const validCategoryKey = Object.keys(chartConfig).includes(categoryKey) ? categoryKey : 'other';
      categoryCounts[validCategoryKey] = (categoryCounts[validCategoryKey] || 0) + (product.stock || 0);
    });

    return Object.entries(categoryCounts).map(([name, items]) => ({
      name: chartConfig[name as keyof typeof chartConfig]?.label || name.charAt(0).toUpperCase() + name.slice(1),
      items,
      fill: chartConfig[name as keyof typeof chartConfig]?.color || "hsl(var(--muted))",
    }));
  }, [products]);

  const totalItems = React.useMemo(() => {
    return products.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  }, [products]);
  
  const noData = chartData.length === 0;

  return (
    <Card className="flex flex-col shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer">
      <CardHeader>
        <CardTitle>Inventory by Category</CardTitle>
        <CardDescription>Distribution of your total stock across categories.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {noData ? (
          <div className="h-[250px] flex flex-col items-center justify-center text-center text-muted-foreground">
            <PieChartIcon className="h-16 w-16 opacity-50 mb-4" />
            <p className="text-lg font-medium">No Data to Display</p>
            <p className="text-sm">Add products with categories to see this chart.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel indicator="dot" />}
                />
                <Pie
                  data={chartData}
                  dataKey="items"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
       <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Total Items: {totalItems.toLocaleString()}
        </div>
        <div className="leading-none text-muted-foreground">
          Showing distribution of all items in stock.
        </div>
      </CardFooter>
    </Card>
  );
}
