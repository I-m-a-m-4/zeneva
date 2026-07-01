'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CachedImage } from '../shared/cached-image';
import { Package, Search, ChevronLeft, ChevronRight, FileText, Download, Calendar as CalendarIcon } from 'lucide-react';
import type { Receipt, Product } from '@/types';
import { format, formatDistanceToNow, startOfDay, endOfDay, isSameDay, subDays } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';

interface DailySalesItemsTableProps {
  receipts: Receipt[];
  products: Product[];
  currencySymbol: string;
}

export default function DailySalesItemsTable({ receipts, products, currencySymbol }: DailySalesItemsTableProps) {
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  // Flatten receipts into individual product/service sales items
  const salesItems = React.useMemo(() => {
    const list: {
      id: string;
      productId: string;
      receiptId: string;
      name: string;
      quantity: number;
      price: number;
      total: number;
      receiptNumber: string;
      createdAt: Date;
      paymentMethod: string;
      imageUrl?: string;
      categoryType?: string;
      category?: string;
    }[] = [];

    const targetDateStart = startOfDay(selectedDate).getTime();
    const targetDateEnd = endOfDay(selectedDate).getTime();
    const sourceReceipts = receipts || [];

    sourceReceipts.forEach(r => {
      const date = safeToDate(r.createdAt);
      const rTime = date.getTime();

      // Filter by the selected day
      if (rTime >= targetDateStart && rTime <= targetDateEnd) {
        r.items?.forEach((item, index) => {
          const cleanItemName = item.name.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
          const product = products?.find(p => 
            p.id === item.productId || 
            p.name.toLowerCase() === cleanItemName
          );
          list.push({
            id: `${r.id}-${item.productId}-${index}`,
            productId: item.productId,
            receiptId: r.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            receiptNumber: r.receiptNumber || 'N/A',
            createdAt: date,
            paymentMethod: r.paymentMethod || 'Walk-in',
            imageUrl: product?.imageUrl || undefined,
            categoryType: product?.categoryType || 'product',
            category: product?.category || undefined
          });
        });
      }
    });

    // Sort by date descending (newest sold items first)
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [receipts, products, selectedDate]);

  // Apply filters and search term
  const filteredItems = React.useMemo(() => {
    let result = [...salesItems];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lower) || 
        item.receiptNumber.toLowerCase().includes(lower) ||
        (item.category && item.category.toLowerCase().includes(lower))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(item => item.categoryType === typeFilter);
    }

    return result;
  }, [salesItems, searchTerm, typeFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, selectedDate]);

  // Pagination calculations
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // CSV export handler
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No items available to export.' });
      return;
    }

    const csvData = Papa.unparse(
      filteredItems.map(item => ({
        'Product/Service': item.name,
        'Type': item.categoryType === 'service' ? 'Service' : 'Product',
        'Quantity': item.quantity,
        'Price': item.price,
        'Total Revenue': item.total,
        'Receipt Number': item.receiptNumber,
        'Payment Method': item.paymentMethod,
        'Date & Time': format(item.createdAt, 'yyyy-MM-dd HH:mm:ss')
      }))
    );

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const reader = new FileReader();
    reader.onloadend = () => {
      link.setAttribute('href', reader.result as string);
      link.setAttribute('download', `zeneva-daily-sales-items-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ variant: 'success', title: 'Export Successful', description: `${filteredItems.length} sales rows exported.` });
    };
    reader.readAsDataURL(blob);
  };

  return (
    <Card className="flex flex-col min-h-0 w-full overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Daily Sales Items Log</CardTitle>
            <CardDescription>
              Detailed logs of individual product and service items sold on the selected day.
            </CardDescription>
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 gap-1 self-start sm:self-auto">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </CardHeader>
      
      {/* Filtering Bar */}
      <div className="px-6 pb-4 border-b flex flex-wrap items-center gap-4 bg-muted/20">
        
        {/* Single Date Picker */}
        <div className="flex items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 justify-start text-left font-normal w-[280px] border border-border bg-background hover:bg-orange-500 hover:text-white transition-all duration-200 group",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                {selectedDate ? (
                  isSameDay(selectedDate, new Date()) ? (
                    `Today (${format(selectedDate, 'EEEE, PP')})`
                  ) : isSameDay(selectedDate, subDays(new Date(), 1)) ? (
                    `Yesterday (${format(selectedDate, 'EEEE, PP')})`
                  ) : (
                    format(selectedDate, 'EEEE, PP')
                  )
                ) : (
                  <span>Pick a day</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative flex-1 min-w-[240px] group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by item name or receipt..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter} modal={false}>
          <SelectTrigger className="w-[180px] min-w-[180px] h-9">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product">Products Only</SelectItem>
            <SelectItem value="service">Services Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }} modal={false}>
          <SelectTrigger className="w-[120px] min-w-[120px] h-9">
            <SelectValue placeholder="Page Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 rows</SelectItem>
            <SelectItem value="30">30 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
            <SelectItem value="100">100 rows</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="text-xs text-muted-foreground ml-auto font-medium">
          Showing {filteredItems.length} item sales
        </div>
      </div>

      <CardContent className="p-0 overflow-y-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16"><span className="sr-only">Image</span></TableHead>
              <TableHead className="font-semibold">Item</TableHead>
              <TableHead className="font-semibold text-center w-24">Qty Sold</TableHead>
              <TableHead className="font-semibold">Price</TableHead>
              <TableHead className="font-semibold">Total Revenue</TableHead>
              <TableHead className="font-semibold">Receipt</TableHead>
              <TableHead className="font-semibold text-right pr-6 w-[180px] min-w-[180px]">Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/10">
                  <TableCell className="py-2">
                    {item.productId && item.productId !== 'custom' ? (
                      <Link href={`/inventory/details?id=${item.productId}`} className="hover:opacity-80 transition-opacity block w-max">
                        {item.imageUrl ? (
                          <div className="relative h-10 w-10">
                            <CachedImage
                              alt={item.name}
                              className="aspect-square rounded-md object-cover w-full h-full border border-border"
                              src={item.imageUrl}
                              fallback={<Package className="h-5 w-5" />}
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-border">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </Link>
                    ) : (
                      item.imageUrl ? (
                        <div className="relative h-10 w-10">
                          <CachedImage
                            alt={item.name}
                            className="aspect-square rounded-md object-cover w-full h-full border border-border"
                            src={item.imageUrl}
                            fallback={<Package className="h-5 w-5" />}
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-border">
                          <Package className="h-5 w-5" />
                        </div>
                      )
                    )}
                  </TableCell>
                  <TableCell className="font-medium py-2">
                    <div className="flex flex-col">
                      {item.productId && item.productId !== 'custom' ? (
                        <Link href={`/inventory/details?id=${item.productId}`} className="text-sm font-semibold hover:underline text-foreground hover:text-primary transition-colors">
                          {item.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold">{item.name}</span>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className={item.categoryType === 'service' 
                            ? "text-[9px] h-3.5 bg-blue-500/10 text-blue-600 border-blue-500/20 px-1 font-semibold" 
                            : "text-[9px] h-3.5 bg-orange-500/10 text-orange-600 border-orange-500/20 px-1 font-semibold"}
                        >
                          {item.categoryType === 'service' ? 'Service' : 'Product'}
                        </Badge>
                        {item.category && <span className="text-[10px] text-muted-foreground font-normal">• {item.category}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold py-2 text-sm text-foreground">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-2 font-bold text-sm text-foreground">
                    {currencySymbol}{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="py-2">
                    <Link href={`/receipts/details?id=${item.receiptId}`} className="group flex flex-col w-max">
                      <span className="text-xs font-mono bg-muted group-hover:bg-primary/10 group-hover:text-primary py-0.5 px-1.5 rounded w-max text-foreground font-medium flex items-center gap-1 border border-border transition-colors">
                        <FileText className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        {item.receiptNumber}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">{item.paymentMethod}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground py-2 pr-6 w-[180px] min-w-[180px] whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-foreground">{formatDistanceToNow(item.createdAt, { addSuffix: true })}</span>
                      <span className="text-[10px] text-muted-foreground/80 mt-0.5">{format(item.createdAt, 'EEE, PPp')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center p-8">
                    <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-semibold text-sm">No sales items logged</p>
                    <p className="text-xs text-muted-foreground mt-1">There are no records matching your active filters on this day.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <CardFooter className="py-3.5 px-6 border-t flex items-center justify-between bg-muted/10">
          <div className="text-xs text-muted-foreground font-medium">
            Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
