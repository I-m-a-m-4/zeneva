'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Package, Building, DollarSign, AlertCircle, Tags } from 'lucide-react';
import type { Product, BusinessInstance } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AdminCatalogTabProps {
    products: Product[];
    businesses: BusinessInstance[];
}

export function AdminCatalogTab({ products, businesses }: AdminCatalogTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 100;

    // Build a business map for O(1) lookups
    const businessMap = useMemo(() => {
        const map = new Map<string, string>();
        businesses.forEach(b => map.set(b.id, b.name));
        return map;
    }, [businesses]);

    // Extract all unique categories and their counts
    const categories = useMemo(() => {
        const counts: Record<string, number> = {};
        products.forEach(p => {
            const cat = p.category || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [products]);

    // Apply filters and search
    const filteredProducts = useMemo(() => {
        let result = products;

        if (selectedCategory !== 'all') {
            result = result.filter(p => (p.category || 'Uncategorized') === selectedCategory);
        }

        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(lower) || 
                (p.sku && p.sku.toLowerCase().includes(lower)) ||
                (p.category && p.category.toLowerCase().includes(lower))
            );
        }

        return result;
    }, [products, selectedCategory, searchTerm]);

    // Compute Metrics
    const metrics = useMemo(() => {
        let totalValue = 0;
        let lowStockCount = 0;
        let totalPrice = 0;
        
        products.forEach(p => {
            const price = Number(p.price) || 0;
            const stock = Number(p.stock) || 0;
            const lowStock = Number(p.lowStockThreshold) || 10;
            
            totalValue += (price * Math.max(0, stock));
            totalPrice += price;
            
            if (stock <= lowStock) {
                lowStockCount++;
            }
        });
        
        const avgPrice = products.length > 0 ? totalPrice / products.length : 0;
        
        return { totalValue, lowStockCount, avgPrice };
    }, [products]);

    // Compute Price Distribution
    const priceDistribution = useMemo(() => {
        const ranges = [
            { name: '₦0-5k', min: 0, max: 5000, count: 0 },
            { name: '₦5k-15k', min: 5000, max: 15000, count: 0 },
            { name: '₦15k-50k', min: 15000, max: 50000, count: 0 },
            { name: '₦50k-100k', min: 50000, max: 100000, count: 0 },
            { name: '₦100k+', min: 100000, max: Infinity, count: 0 },
        ];
        
        products.forEach(p => {
            const price = Number(p.price) || 0;
            const range = ranges.find(r => price >= r.min && price < r.max);
            if (range) range.count++;
        });
        
        return ranges;
    }, [products]);

    // Compute Highest Stock Products
    const highestStockProducts = useMemo(() => {
        return [...products]
            .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
            .slice(0, 5)
            .map(p => ({
                name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                stock: Number(p.stock) || 0,
            }));
    }, [products]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Across all platform stock</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
                        <Tags className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{categories.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Unique product categories</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Stock Alerts</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">{metrics.lowStockCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Items at or below threshold</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Item Price</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₦{metrics.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Mean price per product</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories.slice(0, 7)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {categories.slice(0, 7).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        formatter={(value: number) => [value, 'Products']}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Price Range Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priceDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <RechartsTooltip 
                                        cursor={{ fill: '#374151', opacity: 0.2 }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Products" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Highest Stock Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={highestStockProducts} layout="vertical" margin={{ left: 10, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" />
                                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                    <RechartsTooltip 
                                        cursor={{ fill: '#374151', opacity: 0.2 }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Bar dataKey="stock" fill="#10b981" radius={[0, 4, 4, 0]} name="Units in Stock" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Platform Catalog ({filteredProducts.length.toLocaleString()} Items)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search products by name, SKU, or category..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-background/50 border-white/10"
                            />
                        </div>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="w-full md:w-[250px] bg-background/50 border-white/10">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories ({products.length})</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.name} value={cat.name}>
                                        {cat.name} ({cat.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border border-white/10 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Current Stock</TableHead>
                                    <TableHead>Owning Business</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No products found matching your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map(product => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>{product.sku || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-white/5">
                                                    {product.category || 'Uncategorized'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                ₦{product.price.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={product.stock <= (product.lowStockThreshold || 5) ? 'destructive' : 'secondary'} className={product.stock > (product.lowStockThreshold || 5) ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                                                    {product.stock} units
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="flex items-center gap-2">
                                                <Building className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate max-w-[200px]">
                                                    {businessMap.get(product.businessId) || 'Unknown Business'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="bg-white/5 border-white/10"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm px-2">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="bg-white/5 border-white/10"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
