'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Package, 
    Building, 
    DollarSign, 
    AlertCircle, 
    Tags, 
    Calendar, 
    Clock, 
    X, 
    Filter,
    Eye,
    Copy,
    Check,
    Barcode,
    Layers,
    Boxes,
    FileText,
    Info,
    TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CachedImage } from '@/components/shared/cached-image';
import { cn } from '@/lib/utils';
import type { Product, BusinessInstance } from '@/types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface AdminCatalogTabProps {
    products: Product[];
    businesses: BusinessInstance[];
}

// Safely extract JS Date from product createdAt/updatedAt/expiryDate
const toJsDate = (raw: any): Date | null => {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw.toDate === 'function') return raw.toDate();
    if (raw._seconds) return new Date(raw._seconds * 1000);
    if (raw.seconds) return new Date(raw.seconds * 1000);
    if (typeof raw === 'number') return new Date(raw);
    if (typeof raw === 'string') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

// Safely extract epoch timestamp in ms from product createdAt/updatedAt
const getProductTimestamp = (p: Product): number | null => {
    const raw = p.createdAt || p.updatedAt;
    if (!raw) return null;
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw.toDate === 'function') return raw.toDate().getTime();
    if (raw._seconds) return raw._seconds * 1000;
    if (raw.seconds) return raw.seconds * 1000;
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const t = new Date(raw).getTime();
        return isNaN(t) ? null : t;
    }
    return null;
};

export function AdminCatalogTab({ products, businesses }: AdminCatalogTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
    const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const itemsPerPage = 100;

    const copyToClipboard = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => {
            setCopiedKey(prev => (prev === key ? null : prev));
        }, 2000);
    };

    // Build a business map for O(1) lookups
    const businessMap = useMemo(() => {
        const map = new Map<string, string>();
        businesses.forEach(b => map.set(b.id, b.name || b.id));
        return map;
    }, [businesses]);

    // Extract all unique businesses and their product counts
    const businessOptions = useMemo(() => {
        const counts: Record<string, number> = {};
        products.forEach(p => {
            const bId = p.businessId || 'unknown';
            counts[bId] = (counts[bId] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([id, count]) => ({
                id,
                name: businessMap.get(id) || (id === 'unknown' ? 'Unassigned' : `Tenant ${id.slice(0, 8)}`),
                count
            }))
            .sort((a, b) => b.count - a.count);
    }, [products, businessMap]);

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

        if (selectedBusiness !== 'all') {
            result = result.filter(p => p.businessId === selectedBusiness);
        }

        if (selectedCategory !== 'all') {
            result = result.filter(p => (p.category || 'Uncategorized') === selectedCategory);
        }

        if (selectedTimeRange !== 'all') {
            const now = Date.now();
            const ranges: Record<string, number> = {
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000,
                '30d': 30 * 24 * 60 * 60 * 1000,
                '90d': 90 * 24 * 60 * 60 * 1000,
                '1y': 365 * 24 * 60 * 60 * 1000,
            };
            const maxAge = ranges[selectedTimeRange];
            if (maxAge) {
                result = result.filter(p => {
                    const ts = getProductTimestamp(p);
                    return ts ? (now - ts) <= maxAge : false;
                });
            }
        }

        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p => 
                (p.name && p.name.toLowerCase().includes(lower)) || 
                (p.sku && p.sku.toLowerCase().includes(lower)) ||
                (p.category && p.category.toLowerCase().includes(lower)) ||
                (p.businessId && p.businessId.toLowerCase().includes(lower)) ||
                (businessMap.get(p.businessId)?.toLowerCase().includes(lower))
            );
        }

        return result;
    }, [products, selectedBusiness, selectedCategory, selectedTimeRange, searchTerm, businessMap]);

    const isFiltered = searchTerm.trim() !== '' || selectedCategory !== 'all' || selectedBusiness !== 'all' || selectedTimeRange !== 'all';

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedBusiness('all');
        setSelectedTimeRange('all');
        setCurrentPage(1);
    };

    // Compute Metrics based on filtered dataset
    const metrics = useMemo(() => {
        let totalValue = 0;
        let lowStockCount = 0;
        let totalPrice = 0;
        
        filteredProducts.forEach(p => {
            const price = Number(p.price) || 0;
            const stock = Number(p.stock) || 0;
            const lowStock = Number(p.lowStockThreshold) || 10;
            
            totalValue += (price * Math.max(0, stock));
            totalPrice += price;
            
            if (stock <= lowStock) {
                lowStockCount++;
            }
        });
        
        const avgPrice = filteredProducts.length > 0 ? totalPrice / filteredProducts.length : 0;
        
        return { totalValue, lowStockCount, avgPrice };
    }, [filteredProducts]);

    // Compute Price Distribution on filtered dataset
    const priceDistribution = useMemo(() => {
        const ranges = [
            { name: '₦0-5k', min: 0, max: 5000, count: 0 },
            { name: '₦5k-15k', min: 5000, max: 15000, count: 0 },
            { name: '₦15k-50k', min: 15000, max: 50000, count: 0 },
            { name: '₦50k-100k', min: 50000, max: 100000, count: 0 },
            { name: '₦100k+', min: 100000, max: Infinity, count: 0 },
        ];
        
        filteredProducts.forEach(p => {
            const price = Number(p.price) || 0;
            const range = ranges.find(r => price >= r.min && price < r.max);
            if (range) range.count++;
        });
        
        return ranges;
    }, [filteredProducts]);

    // Compute Highest Stock Products on filtered dataset
    const highestStockProducts = useMemo(() => {
        return [...filteredProducts]
            .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
            .slice(0, 5)
            .map(p => ({
                name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
                stock: Number(p.stock) || 0,
            }));
    }, [filteredProducts]);

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
    }, [searchTerm, selectedCategory, selectedBusiness, selectedTimeRange]);

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
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Platform Catalog ({filteredProducts.length.toLocaleString()} Items)
                    </CardTitle>
                    {isFiltered && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={resetFilters}
                            className="h-8 text-xs bg-white/5 border-white/10 hover:bg-white/10"
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Clear Filters ({filteredProducts.length} of {products.length})
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {/* Filter Bar */}
                    <div className="flex flex-col gap-3 mb-6">
                        <div className="flex flex-col md:flex-row flex-wrap gap-3">
                            {/* Search input */}
                            <div className="relative flex-1 min-w-[240px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search products by name, SKU, category, or business..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-background/50 border-white/10 h-10"
                                />
                            </div>

                            {/* Business Filter */}
                            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                                <SelectTrigger className="w-full md:w-[220px] bg-background/50 border-white/10 h-10">
                                    <div className="flex items-center gap-2 truncate">
                                        <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="All Businesses" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">All Businesses ({products.length})</SelectItem>
                                    {businessOptions.map(b => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name} ({b.count})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Category Filter */}
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-full md:w-[200px] bg-background/50 border-white/10 h-10">
                                    <div className="flex items-center gap-2 truncate">
                                        <Tags className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="All Categories" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">All Categories ({products.length})</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.name} value={cat.name}>
                                            {cat.name} ({cat.count})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Time / Date Filter */}
                            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                                <SelectTrigger className="w-full md:w-[180px] bg-background/50 border-white/10 h-10">
                                    <div className="flex items-center gap-2 truncate">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="All Time" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                                    <SelectItem value="7d">Last 7 Days</SelectItem>
                                    <SelectItem value="30d">Last 30 Days</SelectItem>
                                    <SelectItem value="90d">Last 90 Days</SelectItem>
                                    <SelectItem value="1y">Last 12 Months</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active filter tags */}
                        {isFiltered && (
                            <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                                <span className="font-medium flex items-center gap-1">
                                    <Filter className="h-3 w-3" />
                                    Filtered by:
                                </span>
                                {selectedBusiness !== 'all' && (
                                    <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                                        <Building className="h-3 w-3" />
                                        {businessMap.get(selectedBusiness) || selectedBusiness}
                                        <button onClick={() => setSelectedBusiness('all')} className="ml-1 hover:text-rose-400 font-bold">×</button>
                                    </Badge>
                                )}
                                {selectedCategory !== 'all' && (
                                    <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                                        <Tags className="h-3 w-3" />
                                        {selectedCategory}
                                        <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-rose-400 font-bold">×</button>
                                    </Badge>
                                )}
                                {selectedTimeRange !== 'all' && (
                                    <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                                        <Clock className="h-3 w-3" />
                                        {selectedTimeRange === '24h' ? 'Last 24h' :
                                         selectedTimeRange === '7d' ? 'Last 7 Days' :
                                         selectedTimeRange === '30d' ? 'Last 30 Days' :
                                         selectedTimeRange === '90d' ? 'Last 90 Days' : 'Last 12 Months'}
                                        <button onClick={() => setSelectedTimeRange('all')} className="ml-1 hover:text-rose-400 font-bold">×</button>
                                    </Badge>
                                )}
                                {searchTerm && (
                                    <Badge variant="secondary" className="gap-1 bg-white/10 text-white">
                                        <Search className="h-3 w-3" />
                                        &ldquo;{searchTerm}&rdquo;
                                        <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-rose-400 font-bold">×</button>
                                    </Badge>
                                )}
                            </div>
                        )}
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
                                    <TableHead>Owning Business & Date</TableHead>
                                    <TableHead className="w-[60px] text-right">View</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <AlertCircle className="h-8 w-8 text-muted-foreground opacity-30" />
                                                <p className="font-medium">No products found matching your filter criteria.</p>
                                                {isFiltered && (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={resetFilters} 
                                                        className="mt-2 text-xs bg-white/5 border-white/10"
                                                    >
                                                        Reset All Filters
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedProducts.map(product => {
                                        const ts = getProductTimestamp(product);
                                        const formattedDate = ts ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

                                        return (
                                            <TableRow 
                                                key={product.id}
                                                onClick={() => setSelectedProduct(product)}
                                                className="cursor-pointer hover:bg-muted/50 transition-colors group"
                                                title="Click to view full product details"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-muted/40 border border-border/50 shrink-0 flex items-center justify-center">
                                                            {product.imageUrl ? (
                                                                <CachedImage
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="h-full w-full object-cover"
                                                                    fallback={<Package className="h-5 w-5 text-muted-foreground/50" />}
                                                                />
                                                            ) : (
                                                                <Package className="h-5 w-5 text-muted-foreground/40" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[220px] sm:max-w-[320px]">
                                                                {product.name}
                                                            </div>
                                                            {product.imageHint && (
                                                                <span className="text-[10px] text-muted-foreground/70 truncate block">{product.imageHint}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{product.sku || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-white/5">
                                                        {product.category || 'Uncategorized'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono font-semibold">
                                                    ₦{product.price.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={product.stock <= (product.lowStockThreshold || 5) ? 'destructive' : 'secondary'} className={product.stock > (product.lowStockThreshold || 5) ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                                                        {product.stock} units
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 font-medium">
                                                        <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="truncate max-w-[180px]">
                                                            {businessMap.get(product.businessId) || 'Unknown Business'}
                                                        </span>
                                                    </div>
                                                    {formattedDate && (
                                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Added {formattedDate}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary transition-all rounded-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedProduct(product);
                                                        }}
                                                        title="View full details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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

            {/* Product Details Dialog */}
            {selectedProduct && (
                <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                    <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col border border-border shadow-2xl bg-card text-card-foreground sm:rounded-2xl">
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-border/60 bg-muted/20">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
                                    <Tags className="h-3 w-3 mr-1" />
                                    {selectedProduct.category || 'Uncategorized'}
                                </Badge>
                                {selectedProduct.categoryType && (
                                    <Badge variant="secondary" className="capitalize text-[11px]">
                                        {selectedProduct.categoryType}
                                    </Badge>
                                )}
                                {selectedProduct.type && selectedProduct.type !== 'single' && (
                                    <Badge variant="secondary" className="capitalize text-[11px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                        <Layers className="h-3 w-3 mr-1" />
                                        {selectedProduct.type}
                                    </Badge>
                                )}
                                {selectedProduct.isSerializable && (
                                    <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                        <Barcode className="h-3 w-3 mr-1" />
                                        Serialized
                                    </Badge>
                                )}
                            </div>

                            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pr-8">
                                {selectedProduct.name}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>Owning Business: <strong className="text-foreground">{businessMap.get(selectedProduct.businessId) || selectedProduct.businessId}</strong></span>
                            </DialogDescription>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Visual Image & Quick Financial Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                {/* Image Box */}
                                <div className="md:col-span-5 flex flex-col items-center justify-center">
                                    <div className="relative w-full aspect-square max-h-[260px] rounded-xl overflow-hidden bg-muted/40 border border-border/70 flex items-center justify-center p-3 shadow-inner group">
                                        {selectedProduct.imageUrl ? (
                                            <CachedImage
                                                src={selectedProduct.imageUrl}
                                                alt={selectedProduct.name}
                                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                fallback={
                                                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                                        <Package className="h-12 w-12 stroke-[1.2]" />
                                                        <span className="text-xs">Image unavailable</span>
                                                    </div>
                                                }
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 text-center p-4">
                                                <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                                                    <Package className="h-8 w-8" />
                                                </div>
                                                <span className="text-xs font-medium">No Product Image</span>
                                                {selectedProduct.imageHint && (
                                                    <span className="text-[11px] text-muted-foreground/70 italic max-w-[200px]">
                                                        Hint: {selectedProduct.imageHint}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Financial & Stock Highlights */}
                                <div className="md:col-span-7 flex flex-col justify-between gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Selling Price */}
                                        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-sm flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                <DollarSign className="h-3.5 w-3.5 text-primary" />
                                                Retail Price
                                            </span>
                                            <span className="text-xl sm:text-2xl font-bold font-mono text-primary mt-1">
                                                ₦{Number(selectedProduct.price || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                                per {selectedProduct.baseUnit || 'unit'}
                                            </span>
                                        </div>

                                        {/* Cost Price */}
                                        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-sm flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                Cost Price
                                                {selectedProduct.costPriceEstimated && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400">
                                                        Est
                                                    </Badge>
                                                )}
                                            </span>
                                            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-1">
                                                {selectedProduct.costPrice != null ? `₦${Number(selectedProduct.costPrice).toLocaleString()}` : '—'}
                                            </span>
                                            {selectedProduct.costPrice != null && selectedProduct.price > 0 ? (
                                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                                    <TrendingUp className="h-3 w-3" />
                                                    <span>
                                                        {(((selectedProduct.price - selectedProduct.costPrice) / selectedProduct.price) * 100).toFixed(1)}% margin
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground mt-0.5">Not recorded</span>
                                            )}
                                        </div>

                                        {/* Current Stock */}
                                        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-sm flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                <Boxes className="h-3.5 w-3.5 text-foreground" />
                                                Current Stock
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "text-xl sm:text-2xl font-bold font-mono",
                                                    selectedProduct.stock <= 0 
                                                        ? "text-red-500" 
                                                        : selectedProduct.stock <= (selectedProduct.lowStockThreshold || 5)
                                                            ? "text-amber-500"
                                                            : "text-emerald-600 dark:text-emerald-400"
                                                )}>
                                                    {selectedProduct.stock}
                                                </span>
                                                <Badge 
                                                    variant={selectedProduct.stock <= (selectedProduct.lowStockThreshold || 5) ? 'destructive' : 'secondary'} 
                                                    className={cn(
                                                        "text-[10px] font-medium",
                                                        selectedProduct.stock > (selectedProduct.lowStockThreshold || 5) && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                    )}
                                                >
                                                    {selectedProduct.stock <= 0 ? 'Out of Stock' : selectedProduct.stock <= (selectedProduct.lowStockThreshold || 5) ? 'Low Stock' : 'In Stock'}
                                                </Badge>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                                Threshold: {selectedProduct.lowStockThreshold || 5} units
                                            </span>
                                        </div>

                                        {/* Total Inventory Valuation */}
                                        <div className="p-3.5 rounded-xl border border-border/60 bg-card/60 shadow-sm flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                Total Valuation
                                            </span>
                                            <span className="text-xl sm:text-2xl font-bold font-mono text-foreground mt-1 truncate">
                                                ₦{(Number(selectedProduct.price || 0) * Math.max(0, Number(selectedProduct.stock || 0))).toLocaleString()}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                                at retail price
                                            </span>
                                        </div>
                                    </div>

                                    {/* SKU Barcode Pill */}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Barcode className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block">SKU / Barcode</span>
                                                <span className="text-xs font-mono font-semibold truncate block">
                                                    {selectedProduct.sku || 'No Barcode / SKU'}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedProduct.sku && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(selectedProduct.sku, 'sku')}
                                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                                            >
                                                {copiedKey === 'sku' ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                <span className="ml-1 text-[11px]">{copiedKey === 'sku' ? 'Copied' : 'Copy'}</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description Section */}
                            <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
                                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    <span>Product Description</span>
                                </div>
                                {selectedProduct.description ? (
                                    <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                                        {selectedProduct.description}
                                    </p>
                                ) : (
                                    <p className="text-xs italic text-muted-foreground">
                                        No product description has been added for this item.
                                    </p>
                                )}
                            </div>

                            {/* Detailed Specifications Grid */}
                            <div className="rounded-xl border border-border/60 p-4 bg-card">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-primary" />
                                    <span>Specifications & Audit Identifiers</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Product ID</span>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-mono text-[11px] truncate">{selectedProduct.id}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(selectedProduct.id, 'id')}
                                                className="h-5 w-5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground shrink-0"
                                            >
                                                {copiedKey === 'id' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Owning Business</span>
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold truncate">{businessMap.get(selectedProduct.businessId) || 'Unassigned'}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(selectedProduct.businessId, 'bizId')}
                                                className="h-5 w-5 p-0 hover:bg-transparent text-muted-foreground hover:text-foreground shrink-0"
                                                title="Copy Business ID"
                                            >
                                                {copiedKey === 'bizId' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Category</span>
                                        <span className="font-medium">{selectedProduct.category || 'Uncategorized'}</span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Base Unit</span>
                                        <span className="font-medium">{selectedProduct.baseUnit || 'Piece'}</span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Branch / Outlet</span>
                                        <span className="font-medium font-mono text-[11px]">{selectedProduct.branchId || 'All Branches'}</span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Supplier</span>
                                        <span className="font-medium">{selectedProduct.supplierName || selectedProduct.supplierId || 'Direct'}</span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Date Created</span>
                                        <span className="font-medium">
                                            {(() => {
                                                const d = toJsDate(selectedProduct.createdAt);
                                                return d ? `${format(d, 'PP')} (${formatDistanceToNow(d, { addSuffix: true })})` : '—';
                                            })()}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                        <span className="text-muted-foreground block text-[11px] mb-0.5">Last Updated</span>
                                        <span className="font-medium">
                                            {(() => {
                                                const d = toJsDate(selectedProduct.updatedAt);
                                                return d ? `${format(d, 'PP')} (${formatDistanceToNow(d, { addSuffix: true })})` : '—';
                                            })()}
                                        </span>
                                    </div>

                                    {selectedProduct.expiryDate && (
                                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                                            <span className="text-muted-foreground block text-[11px] mb-0.5">Expiry Date</span>
                                            <div className="flex items-center gap-1 font-medium">
                                                <Calendar className="h-3 w-3 text-amber-500" />
                                                <span>
                                                    {(() => {
                                                        const d = toJsDate(selectedProduct.expiryDate);
                                                        return d ? format(d, 'PP') : String(selectedProduct.expiryDate);
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Additional sections if variants or serial numbers exist */}
                            {selectedProduct.variantName && (
                                <div className="rounded-xl border border-border/60 p-4 bg-muted/20 text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase text-[11px] block mb-1.5">Variant Configuration</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{selectedProduct.variantName}: {selectedProduct.variantValue}</Badge>
                                        {selectedProduct.parentId && (
                                            <span className="text-muted-foreground font-mono text-[11px]">Parent ID: {selectedProduct.parentId}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.serialNumbers && selectedProduct.serialNumbers.length > 0 && (
                                <div className="rounded-xl border border-border/60 p-4 bg-muted/20 text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase text-[11px] block mb-1.5">
                                        Serial Numbers / IMEIs ({selectedProduct.serialNumbers.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                        {selectedProduct.serialNumbers.map((sn, idx) => (
                                            <Badge key={idx} variant="secondary" className="font-mono text-[10px]">
                                                {sn}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedProduct.uomConversions && selectedProduct.uomConversions.length > 0 && (
                                <div className="rounded-xl border border-border/60 p-4 bg-muted/20 text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase text-[11px] block mb-2">
                                        Units of Measure (UoM) Conversions
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedProduct.uomConversions.map((uom, idx) => (
                                            <div key={idx} className="p-2 rounded bg-card border border-border/50">
                                                <div className="font-semibold">{uom.unitName}</div>
                                                <div className="text-muted-foreground text-[11px]">{uom.multiplier}x multiplier</div>
                                                {uom.price != null && (
                                                    <div className="text-primary font-mono font-medium">₦{uom.price.toLocaleString()}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                            <div className="text-xs text-muted-foreground font-mono truncate">
                                <span>ID: {selectedProduct.id}</span>
                            </div>
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => setSelectedProduct(null)}
                                className="px-5"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
