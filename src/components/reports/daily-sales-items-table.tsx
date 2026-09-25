'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CachedImage } from '../shared/cached-image';
import { Package, Search, ChevronLeft, ChevronRight, FileText, Download, Calendar as CalendarIcon, Banknote, ArrowRightLeft, ShieldCheck, CreditCard, Sigma, Users, User, Receipt as ReceiptIcon, Eye } from 'lucide-react';
import type { Receipt, Product } from '@/types';
import { format, formatDistanceToNow, startOfDay, endOfDay, isSameDay, subDays } from 'date-fns';
import { safeToDate, cn } from '@/lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { usePOS } from '@/context/pos-context';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { trackFeature } from '@/lib/product-telemetry';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar } from '@/components/ui/calendar';
import { Printer, Image as ImageIcon, FileSpreadsheet, Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/context/i18n-context';

interface DailySalesItemsTableProps {
  receipts: Receipt[];
  products: Product[];
  currencySymbol: string;
}

export default function DailySalesItemsTable({ receipts, products, currencySymbol }: DailySalesItemsTableProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const tableRef = React.useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const [viewBy, setViewBy] = React.useState<'items' | 'customers' | 'receipts'>('items');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [paymentFilter, setPaymentFilter] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [customerFilter, setCustomerFilter] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const firestore = useFirestore();
  const { currentUserProfile, business } = usePOS();
  const [dailyTransferReceived, setDailyTransferReceived] = React.useState(0);

  // Compute Cash, Transfers, and Card for the selected day
  const { dailyCash, dailyTransferExpected, dailyCard } = React.useMemo(() => {
    let cash = 0;
    let transfer = 0;
    let card = 0;
    const targetDateStart = startOfDay(selectedDate).getTime();
    const targetDateEnd = endOfDay(selectedDate).getTime();

    (receipts || []).forEach(r => {
      const rTime = safeToDate(r.createdAt).getTime();
      if (rTime >= targetDateStart && rTime <= targetDateEnd) {
        if (r.paymentMethod === 'Cash') cash += r.total;
        if (r.paymentMethod === 'Bank Transfer') transfer += r.total;
        if (r.paymentMethod === 'Card' || r.paymentMethod === 'POS Card' || r.paymentMethod?.toLowerCase().includes('card')) card += r.total;
      }
    });

    return { dailyCash: cash, dailyTransferExpected: transfer, dailyCard: card };
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
          // We only want to count actual terminal/bank transfer payment notifications with valid positive amounts.
          if (data.type === 'payment') {
             const amt = typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount || 0).replace(/,/g, ''));
             if (!isNaN(amt) && amt > 0) {
               total += amt;
             }
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
      customerName?: string;
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
            receiptNumber: r.receiptNumber || t('inventory.notAvailable'),
            createdAt: date,
            paymentMethod: r.paymentMethod || t('receipts.walkIn'),
            imageUrl: product?.imageUrl || undefined,
            categoryType: product?.categoryType || 'product',
            category: product?.category || undefined,
            customerName: r.customer?.name || undefined
          });
        });
      }
    });

    // Sort by date descending (newest sold items first)
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [receipts, products, selectedDate, t]);

  // Receipts for the selected day
  const dailyReceipts = React.useMemo(() => {
    const targetDateStart = startOfDay(selectedDate).getTime();
    const targetDateEnd = endOfDay(selectedDate).getTime();

    return (receipts || [])
      .filter(r => {
        const rTime = safeToDate(r.createdAt).getTime();
        return rTime >= targetDateStart && rTime <= targetDateEnd;
      })
      .map(r => ({
        ...r,
        createdAtDate: safeToDate(r.createdAt),
        customerName: r.customer?.name || 'Walk-in Customer',
        itemCount: (r.items || []).reduce((acc, i) => acc + i.quantity, 0),
      }))
      .sort((a, b) => b.createdAtDate.getTime() - a.createdAtDate.getTime());
  }, [receipts, selectedDate]);

  // Customer Summary for the selected day
  const customerSummary = React.useMemo(() => {
    const map = new Map<string, {
      customerName: string;
      receiptsCount: number;
      totalItemsCount: number;
      totalRevenue: number;
      paymentMethods: Set<string>;
      lastTransactionTime: Date;
    }>();

    dailyReceipts.forEach(r => {
      const name = r.customerName;
      const existing = map.get(name) || {
        customerName: name,
        receiptsCount: 0,
        totalItemsCount: 0,
        totalRevenue: 0,
        paymentMethods: new Set<string>(),
        lastTransactionTime: r.createdAtDate,
      };

      existing.receiptsCount += 1;
      existing.totalItemsCount += r.itemCount;
      existing.totalRevenue += r.total;
      if (r.paymentMethod) existing.paymentMethods.add(r.paymentMethod);
      if (r.createdAtDate.getTime() > existing.lastTransactionTime.getTime()) {
        existing.lastTransactionTime = r.createdAtDate;
      }

      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [dailyReceipts]);

  // Extract unique customers for the filter dropdown
  const uniqueCustomers = React.useMemo(() => {
    const customers = new Set<string>();
    salesItems.forEach(item => {
      if (item.customerName) {
        customers.add(item.customerName);
      }
    });
    (receipts || []).forEach(r => {
      if (r.customer?.name) {
        customers.add(r.customer.name);
      }
    });
    return Array.from(customers).sort();
  }, [salesItems, receipts]);

  // Apply filters for Items view
  const filteredItems = React.useMemo(() => {
    let result = [...salesItems];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lower) || 
        item.receiptNumber.toLowerCase().includes(lower) ||
        (item.category && item.category.toLowerCase().includes(lower)) ||
        (item.customerName && item.customerName.toLowerCase().includes(lower))
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(item => item.categoryType === typeFilter);
    }

    if (paymentFilter) {
      if (paymentFilter === 'Verified Transfers' || paymentFilter === 'Expected Bank Transfers') {
        result = result.filter(item => item.paymentMethod === 'Bank Transfer');
      } else if (paymentFilter === 'Cash') {
        result = result.filter(item => item.paymentMethod === 'Cash');
      } else if (paymentFilter === 'Card') {
        result = result.filter(item => item.paymentMethod === 'Card');
      }
    }

    if (customerFilter) {
      result = result.filter(item => item.customerName === customerFilter);
    }

    return result;
  }, [salesItems, searchTerm, typeFilter, paymentFilter, customerFilter]);

  // Apply filters for Customers view
  const filteredCustomers = React.useMemo(() => {
    let result = [...customerSummary];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => c.customerName.toLowerCase().includes(lower));
    }

    if (customerFilter) {
      result = result.filter(c => c.customerName === customerFilter);
    }

    if (paymentFilter) {
      result = result.filter(c => {
        if (paymentFilter === 'Verified Transfers' || paymentFilter === 'Expected Bank Transfers') {
          return c.paymentMethods.has('Bank Transfer');
        } else if (paymentFilter === 'Cash') {
          return c.paymentMethods.has('Cash');
        } else if (paymentFilter === 'Card') {
          return c.paymentMethods.has('Card') || c.paymentMethods.has('POS Card');
        }
        return true;
      });
    }

    return result;
  }, [customerSummary, searchTerm, customerFilter, paymentFilter]);

  // Apply filters for Receipts view
  const filteredReceiptsList = React.useMemo(() => {
    let result = [...dailyReceipts];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r =>
        (r.receiptNumber || '').toLowerCase().includes(lower) ||
        r.customerName.toLowerCase().includes(lower) ||
        (r.paymentMethod || '').toLowerCase().includes(lower) ||
        r.total.toString().includes(lower)
      );
    }

    if (customerFilter) {
      result = result.filter(r => r.customerName === customerFilter);
    }

    if (paymentFilter) {
      if (paymentFilter === 'Verified Transfers' || paymentFilter === 'Expected Bank Transfers') {
        result = result.filter(r => r.paymentMethod === 'Bank Transfer');
      } else if (paymentFilter === 'Cash') {
        result = result.filter(r => r.paymentMethod === 'Cash');
      } else if (paymentFilter === 'Card') {
        result = result.filter(r => r.paymentMethod === 'Card' || r.paymentMethod === 'POS Card');
      }
    }

    return result;
  }, [dailyReceipts, searchTerm, customerFilter, paymentFilter]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, selectedDate, customerFilter, viewBy, paymentFilter]);

  // Active count based on view mode
  const activeFilteredCount = React.useMemo(() => {
    if (viewBy === 'customers') return filteredCustomers.length;
    if (viewBy === 'receipts') return filteredReceiptsList.length;
    return filteredItems.length;
  }, [viewBy, filteredCustomers, filteredReceiptsList, filteredItems]);

  const totalPages = Math.max(1, Math.ceil(activeFilteredCount / pageSize));

  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const paginatedCustomers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(startIndex, startIndex + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const paginatedReceiptsList = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReceiptsList.slice(startIndex, startIndex + pageSize);
  }, [filteredReceiptsList, currentPage, pageSize]);

  // CSV export handler
  const handleExportCSV = () => {
    let rowsToExport: any[] = [];
    let filePrefix = 'zeneva-daily-sales-items';

    if (viewBy === 'customers') {
      filePrefix = 'zeneva-daily-sales-by-customer';
      rowsToExport = filteredCustomers.map(c => ({
        'Customer': c.customerName,
        'Transactions Count': c.receiptsCount,
        'Total Items Purchased': c.totalItemsCount,
        'Payment Methods': Array.from(c.paymentMethods).join(', '),
        'Total Revenue': c.totalRevenue,
        'Last Activity Time': format(c.lastTransactionTime, 'yyyy-MM-dd HH:mm:ss')
      }));
    } else if (viewBy === 'receipts') {
      filePrefix = 'zeneva-daily-sales-by-receipt';
      rowsToExport = filteredReceiptsList.map(r => ({
        'Receipt Number': r.receiptNumber || `rec-${r.id.substring(0, 8)}`,
        'Customer': r.customerName,
        'Items Count': r.itemCount,
        'Payment Method': r.paymentMethod || 'Walk-in',
        'Total Revenue': r.total,
        'Date & Time': format(r.createdAtDate, 'yyyy-MM-dd HH:mm:ss')
      }));
    } else {
      rowsToExport = filteredItems.map(item => ({
        'Product/Service': item.name,
        'Type': item.categoryType === 'service' ? 'Service' : 'Product',
        'Quantity': item.quantity,
        'Price': item.price,
        'Total Revenue': item.total,
        'Receipt Number': item.receiptNumber,
        'Payment Method': item.paymentMethod,
        'Customer': item.customerName || 'N/A',
        'Date & Time': format(item.createdAt, 'yyyy-MM-dd HH:mm:ss')
      }));
    }

    if (rowsToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: t('reports.noDataTitle'),
        description: t('reports.noDataToExport'),
      });
      return;
    }

    trackFeature('reports_exported');
    const csvData = Papa.unparse(rowsToExport);

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const reader = new FileReader();
    reader.onloadend = () => {
      link.setAttribute('href', reader.result as string);
      link.setAttribute('download', `${filePrefix}-${format(selectedDate, 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: 'success',
        title: t('reports.exportSuccessful'),
        description: t('reports.dsiExportedCsvBody', { count: rowsToExport.length }),
      });
    };
    reader.readAsDataURL(blob);
  };

  const handleExportImage = async () => {
    const element = tableRef.current;
    if (!element) return;
    toast({
      title: t('reports.generatingTitle'),
      description: t('reports.dsiGeneratingBody'),
    });
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
        toast({
            variant: 'success',
            title: t('reports.exportSuccessful'),
            description: t('reports.dsiExportedImageBody'),
        });
    } catch (err) {
        toast({
            variant: 'destructive',
            title: t('reports.dsiExportFailed'),
            description: t('reports.dsiExportFailedBody'),
        });
    }
  };

  const handleExportPDF = async () => {
    if (filteredItems.length === 0) {
      toast({
        variant: 'destructive',
        title: t('reports.noDataTitle'),
        description: t('reports.noDataToExport'),
      });
      return;
    }

    toast({
      title: t('reports.generatingPdf'),
      description: t('reports.generatingPdfBody'),
    });

    const doc = new jsPDF();
    
    // Load DM Sans dynamically
    let hasDMSans = false;
    try {
      const fontUrl = 'https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-normal.ttf';
      const fontResponse = await fetch(fontUrl);
      if (fontResponse.ok) {
        const buffer = await fontResponse.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        doc.addFileToVFS('DMSans.ttf', base64);
        doc.addFont('DMSans.ttf', 'DMSans', 'normal');
        doc.setFont('DMSans');
        hasDMSans = true;
      }
    } catch (e) {
      console.warn('Could not load DM Sans font, falling back to Helvetica.', e);
    }

    // Helper to print currency safely
    const formatCurrencyForPDF = (amount: number) => {
      // Use Naira symbol if DM Sans is loaded successfully, otherwise fall back to NGN for Helvetica
      const prefix = hasDMSans ? '₦' : 'NGN ';
      return `${prefix}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Add Watermark
    doc.setTextColor(242, 242, 242);
    doc.setFontSize(80);
    doc.text("ZENEVA", 105, 150, { align: "center", angle: 45 });
    
    // Add Title and Business Name
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(18);
    doc.text(business?.name || "Zeneva POS", 14, 18);
    
    let pdfTitle = "Daily Sales Log - By Items";
    let tableColumn: string[] = [];
    let tableRows: any[] = [];

    if (viewBy === 'customers') {
      pdfTitle = "Daily Sales Log - By Customer";
      tableColumn = ["Customer", "Transactions", "Items Purchased", "Payment Methods", "Total Revenue", "Last Activity"];
      filteredCustomers.forEach(c => {
        tableRows.push([
          c.customerName,
          c.receiptsCount,
          c.totalItemsCount,
          Array.from(c.paymentMethods).join(', '),
          formatCurrencyForPDF(c.totalRevenue),
          format(c.lastTransactionTime, 'HH:mm:ss')
        ]);
      });
    } else if (viewBy === 'receipts') {
      pdfTitle = "Daily Sales Log - By Receipt";
      tableColumn = ["Receipt #", "Customer", "Items", "Payment Method", "Total Revenue", "Time"];
      filteredReceiptsList.forEach(r => {
        tableRows.push([
          r.receiptNumber || `rec-${r.id.substring(0, 8)}`,
          r.customerName,
          r.itemCount,
          r.paymentMethod || 'Walk-in',
          formatCurrencyForPDF(r.total),
          format(r.createdAtDate, 'HH:mm:ss')
        ]);
      });
    } else {
      tableColumn = ["Item", "Type", "Qty", "Price", "Total Revenue", "Receipt", "Time"];
      filteredItems.forEach(item => {
        tableRows.push([
          item.name,
          item.categoryType === 'service' ? 'Service' : 'Product',
          item.quantity,
          formatCurrencyForPDF(item.price),
          formatCurrencyForPDF(item.total),
          item.receiptNumber,
          format(item.createdAt, 'HH:mm:ss')
        ]);
      });
    }

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(pdfTitle, 14, 25);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Report Date: ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`, 14, 31);
    
    // Add Summary Row
    doc.setFontSize(9.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`Cash Sales: ${formatCurrencyForPDF(dailyCash)}`, 14, 40);
    doc.text(`Expected Transfers: ${formatCurrencyForPDF(dailyTransferExpected)}`, 74, 40);
    doc.text(`Verified Transfers: ${formatCurrencyForPDF(dailyTransferReceived)}`, 144, 40);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 47,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 3.5,
        font: hasDMSans ? 'DMSans' : 'helvetica'
      },
      headStyles: { 
        fillColor: [249, 115, 22], 
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      willDrawPage: function (data) {
        // Draw Watermark BEFORE the table content (so it sits behind the table cells)
        if (data.pageNumber > 1) {
          doc.setTextColor(242, 242, 242);
          doc.setFontSize(80);
          doc.text("ZENEVA", 105, 150, { align: "center", angle: 45 });
        }
      },
      didDrawPage: function (data) {
        // Footer: Page Number and Link to zeneva.space
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        if (hasDMSans) doc.setFont('DMSans');
        
        // Left side page number
        doc.text(`Page ${data.pageNumber}`, 14, doc.internal.pageSize.height - 10);
        
        // Right side Zeneva link (clickable)
        doc.textWithLink("Generated via zeneva.space", doc.internal.pageSize.width - 55, doc.internal.pageSize.height - 10, { url: "https://zeneva.space" });
      }
    });

    doc.save(`zeneva-daily-sales-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
    toast({
      variant: 'success',
      title: t('reports.exportSuccessful'),
      description: t('reports.dsiExportedPdfBody'),
    });
  };

  return (
    <Card ref={tableRef} className="flex flex-col min-h-0 w-full overflow-hidden bg-card relative">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-capture print:hidden">
          <div>
            <CardTitle>
              {viewBy === 'items' && t('reports.dsiTitle')}
              {viewBy === 'customers' && 'Daily Sales - By Customer'}
              {viewBy === 'receipts' && 'Daily Sales - By Receipt'}
            </CardTitle>
            <CardDescription>
              {viewBy === 'items' && t('reports.dsiSubtitle')}
              {viewBy === 'customers' && 'Summary of sales and revenue broken down by customer for the selected day.'}
              {viewBy === 'receipts' && 'List of individual transaction receipts generated on the selected day.'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            {/* View Mode Toggle Segmented Control */}
            <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
              <Button
                variant={viewBy === 'items' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => setViewBy('items')}
              >
                <Package className="h-3.5 w-3.5 mr-1.5" />
                By Items
              </Button>
              <Button
                variant={viewBy === 'customers' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => setViewBy('customers')}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                By Customer
              </Button>
              <Button
                variant={viewBy === 'receipts' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => setViewBy('receipts')}
              >
                <ReceiptIcon className="h-3.5 w-3.5 mr-1.5" />
                By Receipt
              </Button>
            </div>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="mr-2 h-4 w-4" />
                  {t('reports.dsiExportReport')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportImage}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {t('reports.dsiExportImage')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t('reports.dsiExportPdf')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {t('reports.dsiExportCsv')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </CardHeader>
      
      {/* Daily Sales Summary Header */}
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 border-b border-border/50 bg-muted/5">
        
        <Card 
          className={`cursor-pointer transition-colors shadow-none ${paymentFilter === null ? 'ring-2 ring-orange-600 dark:ring-orange-400 bg-orange-100 dark:bg-orange-900/60 border-transparent' : 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50 hover:bg-orange-100 dark:hover:bg-orange-900/60'}`}
          onClick={() => setPaymentFilter(null)}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">Total Selection</CardTitle>
            <Sigma className="h-4 w-4 text-orange-400 dark:text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-200">
              {currencySymbol}{
                viewBy === 'customers' 
                  ? filteredCustomers.reduce((acc, item) => acc + item.totalRevenue, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : viewBy === 'receipts'
                    ? filteredReceiptsList.reduce((acc, item) => acc + item.total, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : filteredItems.reduce((acc, item) => acc + item.total, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
              }
            </div>
            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
              Showing {activeFilteredCount} {viewBy === 'customers' ? 'customers' : viewBy === 'receipts' ? 'receipts' : 'item sales'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors shadow-none ${paymentFilter === 'Cash' ? 'ring-2 ring-slate-900 dark:ring-slate-100 bg-slate-100 dark:bg-slate-800 border-transparent' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          onClick={() => setPaymentFilter(prev => prev === 'Cash' ? null : 'Cash')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('reports.dsiCashSales')}</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currencySymbol}{dailyCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('reports.dsiCashHint')}</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors shadow-none ${paymentFilter === 'Expected Bank Transfers' ? 'ring-2 ring-blue-600 dark:ring-blue-400 bg-blue-100 dark:bg-blue-900/60 border-transparent' : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60'}`}
          onClick={() => setPaymentFilter(prev => prev === 'Expected Bank Transfers' ? null : 'Expected Bank Transfers')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">{t('reports.dsiTransfers')}</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-400 dark:text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{currencySymbol}{dailyTransferExpected.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">{t('reports.dsiTransfersHint')}</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors shadow-none ${paymentFilter === 'Card' ? 'ring-2 ring-violet-600 dark:ring-violet-400 bg-violet-100 dark:bg-violet-900/60 border-transparent' : 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50 hover:bg-violet-100 dark:hover:bg-violet-900/60'}`}
          onClick={() => setPaymentFilter(prev => prev === 'Card' ? null : 'Card')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-violet-600 dark:text-violet-400">{t('reports.dsiCard')}</CardTitle>
            <CreditCard className="h-4 w-4 text-violet-400 dark:text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-200">{currencySymbol}{dailyCard.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-1">{t('reports.dsiCardHint')}</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-colors shadow-none ${paymentFilter === 'Verified Transfers' ? 'ring-2 ring-emerald-600 dark:ring-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 border-transparent' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'}`}
          onClick={() => setPaymentFilter(prev => prev === 'Verified Transfers' ? null : 'Verified Transfers')}
        >
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('reports.dsiVerified')}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-400 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{currencySymbol}{dailyTransferReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">{t('reports.dsiVerifiedHint')}</p>
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
                    t('reports.dsiToday', { date: format(selectedDate, 'EEEE, PP') })
                  ) : isSameDay(selectedDate, subDays(new Date(), 1)) ? (
                    t('reports.dsiYesterday', { date: format(selectedDate, 'EEEE, PP') })
                  ) : (
                    format(selectedDate, 'EEEE, PP')
                  )
                ) : (
                  <span>{t('reports.dsiPickDay')}</span>
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
            placeholder={viewBy === 'customers' ? 'Search by customer name...' : viewBy === 'receipts' ? 'Search by receipt # or customer...' : t('reports.dsiSearchPlaceholder')}
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {viewBy === 'items' && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[180px] min-w-[180px] h-9 justify-between font-normal">
                {typeFilter === 'all'
                  ? t('reports.dsiAllTypes')
                  : typeFilter === 'product'
                    ? t('reports.dsiProductsOnly')
                    : t('reports.dsiServicesOnly')}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                {typeFilter === 'all' && <Check className="mr-2 h-4 w-4" />}
                <span className={typeFilter === 'all' ? 'font-medium' : 'ml-6'}>{t('reports.dsiAllTypes')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('product')}>
                {typeFilter === 'product' && <Check className="mr-2 h-4 w-4" />}
                <span className={typeFilter === 'product' ? 'font-medium' : 'ml-6'}>{t('reports.dsiProductsOnly')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('service')}>
                {typeFilter === 'service' && <Check className="mr-2 h-4 w-4" />}
                <span className={typeFilter === 'service' ? 'font-medium' : 'ml-6'}>{t('reports.dsiServicesOnly')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[180px] min-w-[180px] h-9 justify-between font-normal truncate">
              <span className="truncate">{customerFilter || 'All Customers'}</span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[180px] max-h-[300px] overflow-y-auto">
            <DropdownMenuItem onClick={() => setCustomerFilter(null)}>
              {customerFilter === null && <Check className="mr-2 h-4 w-4" />}
              <span className={customerFilter === null ? 'font-medium' : 'ml-6'}>All Customers</span>
            </DropdownMenuItem>
            {uniqueCustomers.length > 0 ? (
              uniqueCustomers.map(customer => (
                <DropdownMenuItem key={customer} onClick={() => setCustomerFilter(customer)}>
                  {customerFilter === customer && <Check className="mr-2 h-4 w-4" />}
                  <span className={customerFilter === customer ? 'font-medium truncate' : 'ml-6 truncate'}>{customer}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                No customer records
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[120px] min-w-[120px] h-9 justify-between font-normal">
              {t('reports.dsiRowsOption', { count: pageSize })}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[120px]">
            {[15, 30, 50, 100].map(size => (
              <DropdownMenuItem key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }}>
                {pageSize === size && <Check className="mr-2 h-4 w-4" />}
                <span className={pageSize === size ? 'font-medium' : 'ml-6'}>{t('reports.dsiRowsOption', { count: size })}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
      </div>

      <CardContent className="p-0 overflow-y-auto flex-1">
        {/* VIEW 1: BY ITEMS */}
        {viewBy === 'items' && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16"><span className="sr-only">{t('inventory.colImage')}</span></TableHead>
                <TableHead className="font-semibold">{t('reports.colItem')}</TableHead>
                <TableHead className="font-semibold text-center w-24">{t('reports.colQtySold')}</TableHead>
                <TableHead className="font-semibold">{t('common.price')}</TableHead>
                <TableHead className="font-semibold">{t('dashboard.totalRevenue')}</TableHead>
                <TableHead className="font-semibold">{t('reports.colReceipt')}</TableHead>
                <TableHead className="font-semibold text-right pr-6 w-[180px] min-w-[180px]">{t('reports.colDateTime')}</TableHead>
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
                            {item.categoryType === 'service' ? t('reports.colService') : t('reports.colProduct')}
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
                        <span className="text-[10px] text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors">
                          {item.paymentMethod}
                          {item.customerName && ` • ${item.customerName}`}
                        </span>
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
                      <p className="font-semibold text-sm">{t('reports.dsiEmptyTitle')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('reports.dsiEmptyBody')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* VIEW 2: BY CUSTOMER */}
        {viewBy === 'customers' && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold text-center">Transactions / Receipts</TableHead>
                <TableHead className="font-semibold text-center">Items Purchased</TableHead>
                <TableHead className="font-semibold">Payment Methods</TableHead>
                <TableHead className="font-semibold">Total Revenue</TableHead>
                <TableHead className="font-semibold text-right pr-6">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.length > 0 ? (
                paginatedCustomers.map((cust, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/10">
                    <TableCell className="font-medium py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-xs border border-orange-500/20">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold">{cust.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold py-3 text-sm">
                      <Badge variant="outline" className="bg-muted/50 font-medium">
                        {cust.receiptsCount} {cust.receiptsCount === 1 ? 'receipt' : 'receipts'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold py-3 text-sm">
                      {cust.totalItemsCount}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {Array.from(cust.paymentMethods).map(pm => (
                          <Badge key={pm} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {pm}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 font-bold text-sm text-foreground">
                      {currencySymbol}{cust.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground py-3 pr-6">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">{formatDistanceToNow(cust.lastTransactionTime, { addSuffix: true })}</span>
                        <span className="text-[10px] text-muted-foreground/80 mt-0.5">{format(cust.lastTransactionTime, 'EEE, PPp')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center p-8">
                      <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="font-semibold text-sm">No Customer Sales Recorded</p>
                      <p className="text-xs text-muted-foreground mt-1">There are no matching customer purchases logged on this day.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* VIEW 3: BY RECEIPT */}
        {viewBy === 'receipts' && (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Receipt #</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold text-center">Items Count</TableHead>
                <TableHead className="font-semibold">Payment Method</TableHead>
                <TableHead className="font-semibold">Total Revenue</TableHead>
                <TableHead className="font-semibold text-right pr-6">Date & Time</TableHead>
                <TableHead className="w-16"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceiptsList.length > 0 ? (
                paginatedReceiptsList.map((rec) => (
                  <TableRow key={rec.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium py-3">
                      <Link href={`/receipts/details?id=${rec.id}`} className="text-xs font-mono bg-muted hover:bg-primary/10 hover:text-primary py-1 px-2 rounded font-semibold text-foreground flex items-center gap-1.5 w-max border border-border transition-colors">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        {rec.receiptNumber || `rec-${rec.id.substring(0, 8)}`}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 font-semibold text-sm text-foreground">
                      {rec.customerName}
                    </TableCell>
                    <TableCell className="text-center font-bold py-3 text-sm">
                      {rec.itemCount} items
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-xs font-medium bg-muted/30">
                        {rec.paymentMethod || 'Walk-in'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 font-bold text-sm text-foreground">
                      {currencySymbol}{rec.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground py-3 pr-6">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">{formatDistanceToNow(rec.createdAtDate, { addSuffix: true })}</span>
                        <span className="text-[10px] text-muted-foreground/80 mt-0.5">{format(rec.createdAtDate, 'EEE, PPp')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <Link href={`/receipts/details?id=${rec.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View Receipt Details</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center p-8">
                      <ReceiptIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="font-semibold text-sm">No Receipts Found</p>
                      <p className="text-xs text-muted-foreground mt-1">There are no receipt transactions matching your active filters on this day.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <CardFooter className="py-3.5 px-6 border-t flex items-center justify-between bg-muted/10">
          {/* The two figures lose their `font-semibold text-foreground` spans. `translate`
              returns a string, so keeping them would mean splitting this into "Page" and
              "of" fragments and fixing the English order — which Arabic reverses and
              Japanese leads with the number. Word order is worth more than the weight
              contrast on a pagination footer. */}
          <div className="text-xs text-muted-foreground font-medium">
            {t('reports.dsiPageOf', { page: currentPage, total: totalPages })}
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
              <span className="sr-only">{t('reports.dsiPrevPage')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">{t('reports.dsiNextPage')}</span>
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
