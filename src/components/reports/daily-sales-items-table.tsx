'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CachedImage } from '../shared/cached-image';
import { Package, Search, ChevronLeft, ChevronRight, FileText, Download, Calendar as CalendarIcon, Banknote, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import type { Receipt, Product } from '@/types';
import { format, formatDistanceToNow, startOfDay, endOfDay, isSameDay, subDays } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { usePOS } from '@/context/pos-context';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Image as ImageIcon, FileSpreadsheet, Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface DailySalesItemsTableProps {
  receipts: Receipt[];
  products: Product[];
  currencySymbol: string;
}

export default function DailySalesItemsTable({ receipts, products, currencySymbol }: DailySalesItemsTableProps) {
  const { toast } = useToast();
  const tableRef = React.useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const firestore = useFirestore();
  const { currentUserProfile } = usePOS();
  const [dailyTransferReceived, setDailyTransferReceived] = React.useState(0);

  // Compute Cash and Expected Transfers for the selected day
  const { dailyCash, dailyTransferExpected } = React.useMemo(() => {
    let cash = 0;
    let transfer = 0;
    const targetDateStart = startOfDay(selectedDate).getTime();
    const targetDateEnd = endOfDay(selectedDate).getTime();

    (receipts || []).forEach(r => {
      const rTime = safeToDate(r.createdAt).getTime();
      if (rTime >= targetDateStart && rTime <= targetDateEnd) {
        if (r.paymentMethod === 'Cash') cash += r.total;
        if (r.paymentMethod === 'Bank Transfer') transfer += r.total;
      }
    });

    return { dailyCash: cash, dailyTransferExpected: transfer };
  }, [receipts, selectedDate]);

  // Fetch actual terminal alerts for the selected day to compute Verified Transfers
  React.useEffect(() => {
    if (!currentUserProfile?.id || !firestore) return;

    const fetchAlerts = async () => {
      try {
        const targetDateStart = startOfDay(selectedDate);
        const targetDateEnd = endOfDay(selectedDate);
        
        const q = query(
          collection(firestore, `users/${currentUserProfile.id}/notifications`),
          where('createdAt', '>=', targetDateStart),
          where('createdAt', '<=', targetDateEnd)
        );

        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.type === 'sale' || data.type === 'payment' || data.title?.toLowerCase().includes('payment') || data.title?.toLowerCase().includes('alert')) {
             const amount = data.amount || parseFloat(data.body.match(/[\d,]+(\.\d+)?/)?.[0]?.replace(/,/g, '') || '0');
             total += amount;
          }
        });
        setDailyTransferReceived(total);
      } catch (err) {
        console.error('Error fetching terminal alerts for day', err);
      }
    };
    fetchAlerts();
  }, [currentUserProfile?.id, firestore, selectedDate]);

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

  const handleExportImage = async () => {
    const element = tableRef.current;
    if (!element) return;
    toast({ title: 'Generating Report...', description: 'Please wait while we capture the daily sales table.' });
    try {
        const canvas = await html2canvas(element, {
            scale: 4,
            ignoreElements: (el) => el.classList.contains('no-capture')
        });
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = `zeneva-daily-sales-${format(selectedDate, 'yyyy-MM-dd')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ variant: 'success', title: 'Export Successful', description: 'Table exported as High-Res Image.' });
    } catch (err) {
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not capture the image.' });
    }
  };

  const handleExportPDF = () => {
    if (filteredItems.length === 0) {
      toast({ variant: 'destructive', title: 'No Data', description: 'No items available to export.' });
      return;
    }

    toast({ title: 'Generating PDF...', description: 'Please wait while we create your document.' });

    const doc = new jsPDF();
    
    // Add Watermark
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(80);
    doc.text("ZENEVA", 105, 150, { align: "center", angle: 45 });
    
    // Add Title and Subtitle
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(16);
    doc.text("Daily Sales Items Log", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Date: ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`, 14, 28);
    
    // Add Summary Boxes
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(`Cash Sales: ${currencySymbol}${dailyCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 14, 38);
    doc.text(`Expected Transfers: ${currencySymbol}${dailyTransferExpected.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 70, 38);
    doc.text(`Verified Transfers: ${currencySymbol}${dailyTransferReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 140, 38);

    const tableColumn = ["Item", "Type", "Qty", "Price", "Total Revenue", "Receipt", "Time"];
    const tableRows: any[] = [];

    filteredItems.forEach(item => {
      const rowData = [
        item.name,
        item.categoryType === 'service' ? 'Service' : 'Product',
        item.quantity,
        `${currencySymbol}${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        `${currencySymbol}${item.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        item.receiptNumber,
        format(item.createdAt, 'HH:mm:ss')
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] }, // Orange-500 branding
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didDrawPage: function (data) {
        if (data.pageNumber > 1) {
          doc.setTextColor(240, 240, 240);
          doc.setFontSize(80);
          doc.text("ZENEVA", 105, 150, { align: "center", angle: 45 });
        }
      }
    });

    doc.save(`zeneva-daily-sales-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
    toast({ variant: 'success', title: 'Export Successful', description: 'Table exported as PDF.' });
  };

  return (
    <Card ref={tableRef} className="flex flex-col min-h-0 w-full overflow-hidden bg-white relative">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-capture print:hidden">
          <div>
            <CardTitle>Daily Sales Items Log</CardTitle>
            <CardDescription>
              Detailed logs of individual product and service items sold on the selected day.
            </CardDescription>
          </div>
          
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 self-start sm:self-auto">
                <Download className="mr-2 h-4 w-4" />Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportImage}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Export as High-Res Image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <Printer className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </CardHeader>
      
      {/* Daily Sales Summary Header */}
      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-border/50 bg-muted/5">
        <Card className="bg-slate-50 border-slate-200 shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500">Day's Cash Sales</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{currencySymbol}{dailyCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 mt-1">Total physical cash expected in drawer</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200 shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-blue-600">Expected Bank Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{currencySymbol}{dailyTransferExpected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-blue-600/70 mt-1">Total transfers processed via POS</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200 shadow-none">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-emerald-600">Verified Transfers</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{currencySymbol}{dailyTransferReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-emerald-600/70 mt-1">Confirmed landing in terminal</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtering Bar */}
      <div className="px-6 py-4 border-b flex flex-wrap items-center gap-4 bg-muted/20 no-capture">
        
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
        
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px] min-w-[180px] h-9 justify-between font-normal">
              {typeFilter === 'all' ? 'All Types' : typeFilter === 'product' ? 'Products Only' : 'Services Only'}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px]">
            <DropdownMenuItem onClick={() => setTypeFilter('all')}>
              {typeFilter === 'all' && <Check className="mr-2 h-4 w-4" />}
              <span className={typeFilter === 'all' ? 'font-medium' : 'ml-6'}>All Types</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter('product')}>
              {typeFilter === 'product' && <Check className="mr-2 h-4 w-4" />}
              <span className={typeFilter === 'product' ? 'font-medium' : 'ml-6'}>Products Only</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter('service')}>
              {typeFilter === 'service' && <Check className="mr-2 h-4 w-4" />}
              <span className={typeFilter === 'service' ? 'font-medium' : 'ml-6'}>Services Only</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[120px] min-w-[120px] h-9 justify-between font-normal">
              {pageSize} rows
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[120px]">
            {[15, 30, 50, 100].map(size => (
              <DropdownMenuItem key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }}>
                {pageSize === size && <Check className="mr-2 h-4 w-4" />}
                <span className={pageSize === size ? 'font-medium' : 'ml-6'}>{size} rows</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
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
