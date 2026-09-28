'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  PlusCircle,
  Search,
  Download,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingDown,
  Coins,
  DollarSign,
  Tag,
  Building2,
  Zap,
  Users2,
  Truck,
  Megaphone,
  Wrench,
  Package,
  FileSpreadsheet,
  ReceiptText,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ArrowDownRight,
  Boxes,
} from "lucide-react";
import { usePOS } from '@/context/pos-context';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { safeToDate, cn } from '@/lib/utils';
import { logAuditEvent } from '@/lib/audit';
import { downloadCsv } from '@/lib/csv';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { Expense, ExpenseCategory, ExpensePaymentMethod } from '@/types';
import { Combobox } from '@/components/ui/combobox';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';

// ======================== EXPENSE DEFINITIONS ========================

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'utilities', label: 'Utilities & Power (Fuel / Gen / NEPA)', icon: Zap, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'salaries', label: 'Staff Salaries & Wages', icon: Users2, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'rent', label: 'Shop Rent & Lease', icon: Building2, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'logistics', label: 'Logistics & Transportation', icon: Truck, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'marketing', label: 'Marketing & Ads', icon: Megaphone, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'packaging', label: 'Bags & Packaging Material', icon: Package, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'inventory_freight', label: 'Stock Waybill & Freight', icon: FileSpreadsheet, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'supplier_payment', label: 'Supplier & Inventory Procurement', icon: Boxes, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'petty_cash', label: 'Daily Petty Cash', icon: Coins, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'taxes', label: 'Taxes, Levies & Fees', icon: ReceiptText, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
  { id: 'miscellaneous', label: 'Miscellaneous / Other', icon: Tag, color: 'text-zinc-900 bg-zinc-100 border-zinc-200 dark:text-zinc-100 dark:bg-zinc-800 dark:border-zinc-700' },
];

export const PAYMENT_METHODS: { id: ExpensePaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash (Drawer / Till)' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'pos_card', label: 'POS / Debit Card' },
  { id: 'personal_funds', label: 'Owner / Personal Funds' },
  { id: 'other', label: 'Other' },
];

// ======================== PURCHASE & SUPPLIER TYPES ========================

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface SupplierPurchase {
  id: string;
  businessId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: any;
  deliveryDate?: any;
  items: PurchaseOrderItem[];
  status: 'ordered' | 'received' | 'cancelled';
  paymentStatus: 'paid' | 'partial' | 'pending';
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod?: ExpensePaymentMethod;
  notes?: string;
  autoRestock?: boolean;
  autoUpdateCost?: boolean;
  createdByName?: string;
  createdById?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  totalPurchased: number;
  totalDebt: number;
  createdAt: any;
  updatedAt: any;
}

// ======================== MAIN UNIFIED HUB ========================

function ExpensesAndPurchasesContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');

  const { business, currentUserProfile, products } = usePOS();
  
  const canViewPurchasesAndSuppliers = currentUserProfile?.role !== 'vendor_operator';
  const firestore = useFirestore();
  const { toast } = useToast();

  const currencySymbol = business?.currency ? (CURRENCY_SYMBOLS[business.currency] || business.currency) : '₦';

  // Active Main Tab: 'expenses' | 'purchases' | 'suppliers'
  const [activeTab, setActiveTab] = React.useState<'expenses' | 'purchases' | 'suppliers'>(
    initialTabParam === 'purchases' || initialTabParam === 'suppliers' ? initialTabParam : 'expenses'
  );

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'purchases' || tab === 'suppliers' || tab === 'expenses') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // -------------------------------------------------------------
  // DATA STATES: EXPENSES
  // -------------------------------------------------------------
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = React.useState(true);

  // Expense Filters
  const [expenseSearch, setExpenseSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedMethod, setSelectedMethod] = React.useState<string>('all');
  const [timeRange, setTimeRange] = React.useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  const [drawerOnly, setDrawerOnly] = React.useState(false);

  // Expense Dialogs
  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = React.useState<Expense | null>(null);

  // -------------------------------------------------------------
  // DATA STATES: PURCHASES & SUPPLIERS
  // -------------------------------------------------------------
  const [purchases, setPurchases] = React.useState<SupplierPurchase[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [loadingPurchases, setLoadingPurchases] = React.useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = React.useState(true);

  // Purchase Filters
  const [searchOrders, setSearchOrders] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
  const [searchSuppliers, setSearchSuppliers] = React.useState('');

  // Purchase Dialogs
  const [isAddOrderOpen, setIsAddOrderOpen] = React.useState(false);
  const [viewingPurchase, setViewingPurchase] = React.useState<SupplierPurchase | null>(null);
  const [receivingPurchase, setReceivingPurchase] = React.useState<SupplierPurchase | null>(null);
  const [payingPurchase, setPayingPurchase] = React.useState<SupplierPurchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = React.useState<SupplierPurchase | null>(null);

  // Supplier Dialogs
  const [isAddSupplierOpen, setIsAddSupplierOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = React.useState<Supplier | null>(null);

  // Drill-down KPI Modal State
  const [selectedKpiModal, setSelectedKpiModal] = React.useState<{
    id: 'total_outflow' | 'operating_overheads' | 'month_expenses' | 'drawer_outflow' | 'stock_procurement' | 'paid_suppliers' | 'accounts_payable' | 'suppliers';
    title: string;
    description: string;
  } | null>(null);
  const [kpiModalSearch, setKpiModalSearch] = React.useState('');

  const [submitting, setSubmitting] = React.useState(false);

  // Form State: Expense
  const [expenseTitle, setExpenseTitle] = React.useState('');
  const [expenseAmount, setExpenseAmount] = React.useState('');
  const [expenseCategory, setExpenseCategory] = React.useState<ExpenseCategory>('miscellaneous');
  const [expenseMethod, setExpenseMethod] = React.useState<ExpensePaymentMethod>('cash');
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [expenseRecipient, setExpenseRecipient] = React.useState('');
  const [expenseNotes, setExpenseNotes] = React.useState('');
  const [expenseDeductDrawer, setExpenseDeductDrawer] = React.useState(true);

  // Form State: Purchase Order
  const [orderSupplierId, setOrderSupplierId] = React.useState('');
  const [orderDate, setOrderDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = React.useState('');
  const [orderItems, setOrderItems] = React.useState<PurchaseOrderItem[]>([
    { productId: '', productName: '', quantityOrdered: 1, quantityReceived: 0, unitCost: 0, totalCost: 0 },
  ]);
  const [orderAmountPaid, setOrderAmountPaid] = React.useState('0');
  const [orderPaymentMethod, setOrderPaymentMethod] = React.useState<ExpensePaymentMethod>('bank_transfer');
  const [orderNotes, setOrderNotes] = React.useState('');
  const [autoRestock, setAutoRestock] = React.useState(true);
  const [autoUpdateCost, setAutoUpdateCost] = React.useState(true);

  // Form State: Supplier
  const [supplierName, setSupplierName] = React.useState('');
  const [supplierContact, setSupplierContact] = React.useState('');
  const [supplierPhone, setSupplierPhone] = React.useState('');
  const [supplierEmail, setSupplierEmail] = React.useState('');
  const [supplierAddress, setSupplierAddress] = React.useState('');
  const [supplierTerms, setSupplierTerms] = React.useState('Immediate');
  const [supplierNotes, setSupplierNotes] = React.useState('');

  // Form State: Record Payment
  const [payAmount, setPayAmount] = React.useState('');
  const [payMethod, setPayMethod] = React.useState<ExpensePaymentMethod>('bank_transfer');

  // -------------------------------------------------------------
  // REALTIME LISTENERS
  // -------------------------------------------------------------
  React.useEffect(() => {
    if (!firestore || !business?.id) {
      setLoadingExpenses(false);
      setLoadingPurchases(false);
      setLoadingSuppliers(false);
      return;
    }

    setLoadingExpenses(true);
    setLoadingPurchases(true);
    setLoadingSuppliers(true);

    // 1. Expenses Listener
    const expQ = query(
      collection(firestore, 'expenses'),
      where('businessId', '==', business.id),
      limit(500)
    );
    const unsubExp = onSnapshot(expQ, (snapshot) => {
      const rows: Expense[] = [];
      snapshot.forEach(docSnap => rows.push({ id: docSnap.id, ...(docSnap.data() as any) }));
      rows.sort((a, b) => (safeToDate(b.date)?.getTime() || 0) - (safeToDate(a.date)?.getTime() || 0));
      setExpenses(rows);
      setLoadingExpenses(false);
    }, (err) => {
      console.error("Error loading expenses:", err);
      setLoadingExpenses(false);
    });

    // 2. Purchases Listener
    const purchQ = query(
      collection(firestore, 'supplier_purchases'),
      where('businessId', '==', business.id),
      limit(500)
    );
    const unsubPurch = onSnapshot(purchQ, (snapshot) => {
      const rows: SupplierPurchase[] = [];
      snapshot.forEach(d => rows.push({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => (safeToDate(b.orderDate || b.createdAt)?.getTime() || 0) - (safeToDate(a.orderDate || a.createdAt)?.getTime() || 0));
      setPurchases(rows);
      setLoadingPurchases(false);
    }, (err) => {
      console.error("Error loading purchases:", err);
      setLoadingPurchases(false);
    });

    // 3. Suppliers Listener
    const supQ = query(
      collection(firestore, 'suppliers'),
      where('businessId', '==', business.id),
      limit(300)
    );
    const unsubSup = onSnapshot(supQ, (snapshot) => {
      const rows: Supplier[] = [];
      snapshot.forEach(d => rows.push({ id: d.id, ...(d.data() as any) }));
      rows.sort((a, b) => (b.totalDebt || 0) - (a.totalDebt || 0));
      setSuppliers(rows);
      setLoadingSuppliers(false);
    }, (err) => {
      console.error("Error loading suppliers:", err);
      setLoadingSuppliers(false);
    });

    return () => {
      unsubExp();
      unsubPurch();
      unsubSup();
    };
  }, [firestore, business?.id]);

  // -------------------------------------------------------------
  // METRICS COMPUTATION (COMBINED SPEND & OUTFLOW)
  // -------------------------------------------------------------
  const metrics = React.useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filtered Expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expensesFromDrawer = expenses.filter(e => e.deductFromCashDrawer).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthExpenses = expenses.filter(e => safeToDate(e.date) >= startOfThisMonth).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Filtered Purchases
    const totalProcurement = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPurchasesPaid = purchases.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalSupplierDebt = purchases.reduce((sum, p) => sum + (Number(p.balanceDue) || 0), 0);

    // Combined Cash Outflow (Total Expenses + Total Purchase Bills)
    const combinedOutflow = totalExpenses + totalProcurement;

    return {
      totalExpenses,
      expensesFromDrawer,
      monthExpenses,
      totalProcurement,
      totalPurchasesPaid,
      totalSupplierDebt,
      combinedOutflow,
    };
  }, [expenses, purchases]);

  // -------------------------------------------------------------
  // FILTERED EXPENSES
  // -------------------------------------------------------------
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(exp => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (selectedMethod !== 'all' && exp.paymentMethod !== selectedMethod) return false;
      if (drawerOnly && !exp.deductFromCashDrawer) return false;

      if (timeRange !== 'all') {
        const expDate = safeToDate(exp.date);
        const now = new Date();
        if (timeRange === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (expDate < startOfToday) return false;
        } else if (timeRange === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (expDate < sevenDaysAgo) return false;
        } else if (timeRange === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (expDate < thirtyDaysAgo) return false;
        } else if (timeRange === 'year') {
          const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          if (expDate < oneYearAgo) return false;
        }
      }

      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(q);
        const matchesRecipient = (exp.recipient || '').toLowerCase().includes(q);
        const matchesNotes = (exp.notes || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesRecipient && !matchesNotes) return false;
      }

      return true;
    });
  }, [expenses, selectedCategory, selectedMethod, timeRange, drawerOnly, expenseSearch]);

  const handleExportExpenseReport = async () => {
    toast({
      title: 'Generating PDF',
      description: 'Your expense report is being generated...',
    });

    const doc = new jsPDF();
    
    // Add title
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(18);
    doc.text(business?.name || "Zeneva POS", 14, 18);
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text("Expense Report", 14, 25);
    
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated: ${format(new Date(), 'EEEE, MMMM d, yyyy')}`, 14, 31);
    
    if (timeRange !== 'all') {
      doc.text(`Time Period: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`, 14, 36);
    }

    const tableColumn = ["Date", "Title", "Category", "Payment Method", "Recipient", "Amount"];
    
    const tableRows = filteredExpenses.map(exp => {
      const dateObj = safeToDate(exp.date);
      const formattedDate = dateObj ? format(dateObj, 'MMM d, yyyy') : 'N/A';
      
      const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
      const catName = catInfo?.label.split('(')[0].trim() || exp.category;
      
      const methodStr = exp.paymentMethod.replace('_', ' ');
      const methodCap = methodStr.charAt(0).toUpperCase() + methodStr.slice(1);
      
      return [
        formattedDate,
        exp.title,
        catName,
        `${methodCap}${exp.deductFromCashDrawer ? ' (Drawer)' : ''}`,
        exp.recipient || '-',
        `${currencySymbol}${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      ];
    });

    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    tableRows.push([
      "Total", 
      "", 
      "", 
      "", 
      "", 
      `${currencySymbol}${totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didParseCell: function(data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`zeneva-expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // -------------------------------------------------------------
  // FILTERED PURCHASES
  // -------------------------------------------------------------
  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && p.paymentStatus !== paymentFilter) return false;

      if (searchOrders.trim()) {
        const q = searchOrders.toLowerCase();
        const matchesPo = (p.poNumber || '').toLowerCase().includes(q);
        const matchesSup = (p.supplierName || '').toLowerCase().includes(q);
        const matchesItem = p.items?.some(i => i.productName.toLowerCase().includes(q));
        if (!matchesPo && !matchesSup && !matchesItem) return false;
      }
      return true;
    });
  }, [purchases, statusFilter, paymentFilter, searchOrders]);

  // -------------------------------------------------------------
  // FILTERED SUPPLIERS
  // -------------------------------------------------------------
  const filteredSuppliers = React.useMemo(() => {
    if (!searchSuppliers.trim()) return suppliers;
    const q = searchSuppliers.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  }, [suppliers, searchSuppliers]);

  // -------------------------------------------------------------
  // CHART DATA COMPUTATION
  // -------------------------------------------------------------
  const chartData = React.useMemo(() => {
    // 1. Expenses by Category
    const catMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(e.amount) || 0));
    });
    const expensesByCategory = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 2. Spending Trend (Dynamic period based on timeRange filter)
    const trendMap = new Map<string, { date: string; expenses: number; purchases: number }>();
    const now = new Date();

    let daysCount = 30;
    if (timeRange === '7d' || timeRange === 'week') daysCount = 7;
    else if (timeRange === 'month') daysCount = 30;
    else if (timeRange === 'today') daysCount = 1;
    else if (timeRange === 'year' || timeRange === 'all') daysCount = 90;

    if (daysCount === 1) {
      const todayStr = now.toISOString().split('T')[0];
      trendMap.set(todayStr, { date: 'Today', expenses: 0, purchases: 0 });
    } else {
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        trendMap.set(key, {
          date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          expenses: 0,
          purchases: 0
        });
      }
    }
    
    filteredExpenses.forEach(e => {
      const dateStr = safeToDate(e.date)?.toISOString().split('T')[0];
      if (dateStr && trendMap.has(dateStr)) {
        trendMap.get(dateStr)!.expenses += (Number(e.amount) || 0);
      }
    });

    filteredPurchases.forEach(p => {
      const dateStr = safeToDate(p.orderDate)?.toISOString().split('T')[0];
      if (dateStr && trendMap.has(dateStr)) {
        trendMap.get(dateStr)!.purchases += (Number(p.totalAmount) || 0);
      }
    });

    return {
      expensesByCategory,
      spendingTrend: Array.from(trendMap.values())
    };
  }, [filteredExpenses, filteredPurchases, timeRange]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  // -------------------------------------------------------------
  // EXPENSE ACTIONS
  // -------------------------------------------------------------
  const resetExpenseForm = () => {
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseCategory('miscellaneous');
    setExpenseMethod('cash');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseRecipient('');
    setExpenseNotes('');
    setExpenseDeductDrawer(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !business?.id) return;
    const amt = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Expense', description: 'Please enter a valid title and amount.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Omit<Expense, 'id'> = {
        businessId: business.id,
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
        paymentMethod: expenseMethod,
        date: Timestamp.fromDate(new Date(expenseDate)),
        recipient: expenseRecipient.trim() || undefined,
        notes: expenseNotes.trim() || undefined,
        deductFromCashDrawer: expenseDeductDrawer && expenseMethod === 'cash',
        createdByName: currentUserProfile?.name || currentUserProfile?.email || 'User',
        createdById: currentUserProfile?.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (editingExpense) {
        await updateDoc(doc(firestore, 'expenses', editingExpense.id), {
          title: payload.title,
          amount: payload.amount,
          category: payload.category,
          paymentMethod: payload.paymentMethod,
          date: payload.date,
          recipient: payload.recipient || null,
          notes: payload.notes || null,
          deductFromCashDrawer: payload.deductFromCashDrawer,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Expense Updated', description: `${payload.title} has been updated.` });
      } else {
        await addDoc(collection(firestore, 'expenses'), payload);
        if (currentUserProfile) {
          await logAuditEvent(firestore, business.id, currentUserProfile, {
            action: 'inventory.edit',
            entity: { type: 'business', id: business.id, name: 'Expense Created' },
            details: { title: payload.title, amount: payload.amount, category: payload.category }
          });
        }
        toast({ title: 'Expense Recorded', description: `${payload.title} (${currencySymbol}${payload.amount.toLocaleString()}) logged.` });
      }

      setIsAddExpenseOpen(false);
      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      resetExpenseForm();
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Could not record expense.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!firestore || !business?.id || !deletingExpense) return;
    setSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'expenses', deletingExpense.id));
      toast({ title: 'Expense Removed' });
      setDeletingExpense(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Delete', description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // PURCHASE ORDER ACTIONS
  // -------------------------------------------------------------
  const resetOrderForm = () => {
    setOrderSupplierId(suppliers[0]?.id || '');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate('');
    setOrderItems([{ productId: '', productName: '', quantityOrdered: 1, quantityReceived: 0, unitCost: 0, totalCost: 0 }]);
    setOrderAmountPaid('0');
    setOrderPaymentMethod('bank_transfer');
    setOrderNotes('');
    setAutoRestock(true);
    setAutoUpdateCost(true);
  };

  const handleOrderItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updated = [...orderItems];
    const row = { ...updated[index] };

    if (field === 'productId') {
      const p = products.find(prod => prod.id === value);
      row.productId = value;
      row.productName = p?.name || 'Custom Product';
      row.unitCost = p?.costPrice || p?.price || 0;
      row.totalCost = row.quantityOrdered * row.unitCost;
    } else if (field === 'quantityOrdered') {
      const qty = Math.max(1, parseInt(value) || 1);
      row.quantityOrdered = qty;
      row.totalCost = qty * row.unitCost;
    } else if (field === 'unitCost') {
      const cost = Math.max(0, parseFloat(value) || 0);
      row.unitCost = cost;
      row.totalCost = row.quantityOrdered * cost;
    }

    updated[index] = row;
    setOrderItems(updated);
  };

  const handleAddOrderItem = () => {
    setOrderItems(prev => [
      ...prev,
      { productId: '', productName: '', quantityOrdered: 1, quantityReceived: 0, unitCost: 0, totalCost: 0 }
    ]);
  };

  const handleRemoveOrderItem = (index: number) => {
    if (orderItems.length <= 1) return;
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const orderCalculatedTotal = React.useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  }, [orderItems]);

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !business?.id) return;

    if (!orderSupplierId) {
      toast({ variant: 'destructive', title: 'Supplier Required', description: 'Please pick or add a supplier.' });
      return;
    }

    const validItems = orderItems.filter(i => i.productName && i.quantityOrdered > 0);
    if (validItems.length === 0) {
      toast({ variant: 'destructive', title: 'Items Required', description: 'Please add at least one product to this order.' });
      return;
    }

    setSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === orderSupplierId);
      const poNum = `PO-${Date.now().toString().slice(-6)}`;
      const totalAmt = orderCalculatedTotal;
      const amtPaid = Math.min(totalAmt, Math.max(0, parseFloat(orderAmountPaid) || 0));
      const balDue = Math.max(0, totalAmt - amtPaid);

      const paymentStatus: 'paid' | 'partial' | 'pending' =
        balDue <= 0 ? 'paid' : amtPaid > 0 ? 'partial' : 'pending';

      const payload: Omit<SupplierPurchase, 'id'> = {
        businessId: business.id,
        poNumber: poNum,
        supplierId: orderSupplierId,
        supplierName: supplier?.name || 'Supplier',
        orderDate: Timestamp.fromDate(new Date(orderDate)),
        deliveryDate: deliveryDate ? Timestamp.fromDate(new Date(deliveryDate)) : null,
        items: validItems,
        status: 'ordered',
        paymentStatus,
        totalAmount: totalAmt,
        amountPaid: amtPaid,
        balanceDue: balDue,
        paymentMethod: orderPaymentMethod,
        notes: orderNotes.trim() || undefined,
        autoRestock,
        autoUpdateCost,
        createdByName: currentUserProfile?.name || 'Staff',
        createdById: currentUserProfile?.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'supplier_purchases'), payload);

      // Auto-log initial payment to supplier as an Expense
      if (amtPaid > 0) {
        await addDoc(collection(firestore, 'expenses'), {
          businessId: business.id,
          title: `Supplier Payment (${poNum} - ${supplier?.name || 'Supplier'})`,
          amount: amtPaid,
          category: 'supplier_payment',
          paymentMethod: (orderPaymentMethod as any) || 'bank_transfer',
          description: `Payment for Purchase Order ${poNum} to ${supplier?.name || 'Supplier'}`,
          date: Timestamp.fromDate(new Date(orderDate)),
          recipient: supplier?.name || 'Supplier',
          deductFromCashDrawer: orderPaymentMethod === 'cash',
          status: 'paid',
          referenceId: poNum,
          createdByName: currentUserProfile?.name || 'Staff',
          createdById: currentUserProfile?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Update supplier's debt and lifetime spend
      if (supplier) {
        await updateDoc(doc(firestore, 'suppliers', supplier.id), {
          totalPurchased: increment(totalAmt),
          totalDebt: increment(balDue),
          updatedAt: serverTimestamp(),
        });
      }

      toast({ title: 'Purchase Order Created', description: `${poNum} for ${supplier?.name} logged.` });
      setIsAddOrderOpen(false);
      resetOrderForm();
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Order Failed', description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceivePurchaseOrder = async (purchase: SupplierPurchase) => {
    if (!firestore || !business?.id) return;
    setSubmitting(true);

    try {
      const batch = writeBatch(firestore);

      // 1. Mark purchase as received
      const purchaseRef = doc(firestore, 'supplier_purchases', purchase.id);
      batch.update(purchaseRef, {
        status: 'received',
        updatedAt: serverTimestamp(),
      });

      // 2. Increment product stocks
      if (purchase.autoRestock !== false && purchase.items?.length > 0) {
        for (const item of purchase.items) {
          if (item.productId) {
            const productRef = doc(firestore, 'products', item.productId);
            const updatePayload: any = {
              stock: increment(item.quantityOrdered),
              updatedAt: serverTimestamp(),
            };
            if (purchase.autoUpdateCost && item.unitCost > 0) {
              updatePayload.costPrice = item.unitCost;
            }
            batch.update(productRef, updatePayload);
            
            // Log Inventory Transaction
            const txRef = doc(collection(firestore, 'inventory_transactions'));
            batch.set(txRef, {
              businessId: business.id,
              productId: item.productId,
              productName: item.productName || 'Unknown',
              type: 'in',
              quantity: item.quantityOrdered,
              date: serverTimestamp(),
              notes: purchase.poNumber ? `Restock (PO #${purchase.poNumber})` : 'Restock',
              referenceId: purchase.id,
              createdBy: currentUserProfile?.name || 'System'
            });
          }
        }
      }

      await batch.commit();

      toast({
        title: 'Inventory Restocked!',
        description: `Order ${purchase.poNumber} marked as received. Products restocked successfully.`,
      });
      setReceivingPurchase(null);
    } catch (err: any) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Restock Failed', description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordOrderPayment = async (purchase: SupplierPurchase) => {
    if (!firestore || !business?.id) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid payment amount.' });
      return;
    }

    setSubmitting(true);
    try {
      const payActual = Math.min(purchase.balanceDue, amount);
      const newPaid = (purchase.amountPaid || 0) + payActual;
      const newBalance = Math.max(0, (purchase.totalAmount || 0) - newPaid);
      const newPaymentStatus: 'paid' | 'partial' | 'pending' = newBalance <= 0 ? 'paid' : 'partial';

      await updateDoc(doc(firestore, 'supplier_purchases', purchase.id), {
        amountPaid: newPaid,
        balanceDue: newBalance,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp(),
      });

      // Auto-log supplier payment as an Expense
      if (payActual > 0) {
        await addDoc(collection(firestore, 'expenses'), {
          businessId: business.id,
          title: `Supplier Payment (${purchase.poNumber} - ${purchase.supplierName})`,
          amount: payActual,
          category: 'supplier_payment',
          paymentMethod: (payMethod as any) || 'bank_transfer',
          description: `Payment towards Purchase Order ${purchase.poNumber} (${purchase.supplierName})`,
          date: serverTimestamp(),
          recipient: purchase.supplierName,
          deductFromCashDrawer: payMethod === 'cash',
          status: 'paid',
          referenceId: purchase.poNumber,
          createdByName: currentUserProfile?.name || 'Staff',
          createdById: currentUserProfile?.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Update supplier debt
      if (purchase.supplierId) {
        await updateDoc(doc(firestore, 'suppliers', purchase.supplierId), {
          totalDebt: increment(-payActual),
          updatedAt: serverTimestamp(),
        });
      }

      toast({ title: 'Payment Logged', description: `${currencySymbol}${payActual.toLocaleString()} paid towards ${purchase.poNumber}.` });
      setPayingPurchase(null);
      setPayAmount('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUPPLIER ACTIONS
  // -------------------------------------------------------------
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !business?.id || !supplierName.trim()) return;

    setSubmitting(true);
    try {
      const payload: Omit<Supplier, 'id'> = {
        businessId: business.id,
        name: supplierName.trim(),
        contactPerson: supplierContact.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
        email: supplierEmail.trim() || undefined,
        address: supplierAddress.trim() || undefined,
        paymentTerms: supplierTerms,
        notes: supplierNotes.trim() || undefined,
        totalPurchased: 0,
        totalDebt: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(firestore, 'suppliers'), payload);

      toast({ title: 'Supplier Added', description: `${payload.name} added to vendor directory.` });
      setOrderSupplierId(docRef.id);
      setIsAddSupplierOpen(false);
      setSupplierName('');
      setSupplierContact('');
      setSupplierPhone('');
      setSupplierEmail('');
      setSupplierAddress('');
      setSupplierNotes('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Add Supplier', description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Export Expenses
  const handleExportExpensesCsv = () => {
    if (filteredExpenses.length === 0) return;
    const rows: (string | number)[][] = [
      ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Paid From Till', 'Recipient', 'Logged By', 'Notes']
    ];
    filteredExpenses.forEach(e => {
      rows.push([
        safeToDate(e.date)?.toISOString().split('T')[0] || '',
        e.title,
        e.category,
        e.amount,
        e.paymentMethod,
        e.deductFromCashDrawer ? 'Yes' : 'No',
        e.recipient || '',
        e.createdByName || '',
        e.notes || ''
      ]);
    });
    downloadCsv(`zeneva-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Expenses Exported' });
  };

  // Export Purchases
  const handleExportPurchasesCsv = () => {
    if (filteredPurchases.length === 0) return;
    const rows: (string | number)[][] = [
      ['PO Number', 'Date', 'Supplier', 'Items Count', 'Total Amount', 'Amount Paid', 'Balance Due', 'Order Status', 'Payment Status', 'Notes']
    ];
    filteredPurchases.forEach(p => {
      rows.push([
        p.poNumber,
        safeToDate(p.orderDate)?.toISOString().split('T')[0] || '',
        p.supplierName,
        p.items?.length || 0,
        p.totalAmount,
        p.amountPaid,
        p.balanceDue,
        p.status,
        p.paymentStatus,
        p.notes || ''
      ]);
    });
    downloadCsv(`zeneva-purchases-${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Purchases Exported' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ======================== UNIFIED HEADER ======================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-7 w-7 text-primary" />
            Expenses & Purchases
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage operating overheads, bills, stock procurement, and supplier payables in one unified hub.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'expenses' && (
            <Button variant="outline" size="sm" onClick={handleExportExpensesCsv} disabled={filteredExpenses.length === 0}>
              <Download className="h-4 w-4 me-2" />
              Export CSV
            </Button>
          )}
          {activeTab === 'purchases' && (
            <Button variant="outline" size="sm" onClick={handleExportPurchasesCsv} disabled={filteredPurchases.length === 0}>
              <Download className="h-4 w-4 me-2" />
              Export CSV
            </Button>
          )}

          <Button onClick={() => { resetExpenseForm(); setIsAddExpenseOpen(true); }} variant="outline" className="shadow-xs group hover:bg-primary hover:text-primary-foreground">
            <PlusCircle className="h-4 w-4 me-2 text-primary group-hover:text-primary-foreground" />
            Record Expense
          </Button>

          <Button onClick={() => { resetOrderForm(); setIsAddOrderOpen(true); }} className="shadow-sm group hover:bg-primary hover:text-primary-foreground">
            <Truck className="h-4 w-4 me-2 group-hover:text-primary-foreground" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* ======================== COMBINED OUTFLOW KPI CARDS ======================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ROW 1 */}
        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'total_outflow',
              title: 'Total Cash Outflow Breakdown',
              description: 'Combined operational expenses and stock procurement payments.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-primary transition-colors flex items-center justify-between">
              <span>Total Cash Outflow</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {currencySymbol}{metrics.combinedOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Expenses ({currencySymbol}{metrics.totalExpenses.toLocaleString()}) + Restock ({currencySymbol}{metrics.totalProcurement.toLocaleString()})
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'operating_overheads',
              title: 'Operating Overheads Breakdown',
              description: 'All-time shop operational costs categorized by utility, rent, staff, packaging, etc.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-amber-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center justify-between">
              <span>Operating Overheads</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {currencySymbol}{metrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              All-time operational expenses
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'month_expenses',
              title: 'Expenses This Month Breakdown',
              description: 'Operational costs incurred during the current calendar month.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-amber-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center justify-between">
              <span>Expenses This Month</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {currencySymbol}{metrics.monthExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Total expenses for current month
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'drawer_outflow',
              title: 'Drawer / Till Cash Outflow',
              description: 'Operating cash expenses deducted directly from the daily cash register till.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-emerald-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
              <span>Drawer / Till Outflow</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {currencySymbol}{metrics.expensesFromDrawer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              Cash deducted from daily till
            </p>
          </CardContent>
        </Card>

        {/* ROW 2 */}
        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'stock_procurement',
              title: 'Stock Procurement Bills',
              description: 'Purchase orders issued to distributors and wholesalers for inventory restock.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-blue-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
              <span>Stock Procurement</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currencySymbol}{metrics.totalProcurement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {purchases.length} restock purchase bills
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'paid_suppliers',
              title: 'Settled Procurement Payments',
              description: 'Purchase bills fully or partially settled to suppliers.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-blue-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
              <span>Paid to Suppliers</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {currencySymbol}{metrics.totalPurchasesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Total procurement bills settled
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'accounts_payable',
              title: 'Accounts Payable (Supplier Debt)',
              description: 'Outstanding purchase bill balances owed to suppliers.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-rose-500/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center justify-between">
              <span>Accounts Payable (Debt)</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {currencySymbol}{metrics.totalSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Outstanding bills owed to suppliers
            </p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => {
            setKpiModalSearch('');
            setSelectedKpiModal({
              id: 'suppliers',
              title: 'Active Suppliers Directory',
              description: 'Wholesalers, distributors, and vendors registered in your database.',
            });
          }}
          className="shadow-xs cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium group-hover:text-primary transition-colors flex items-center justify-between">
              <span>Active Suppliers</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {suppliers.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Vendors managing your inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ======================== ANALYTICS CHARTS ======================== */}
      {(chartData.expensesByCategory.length > 0 || chartData.spendingTrend.some(d => d.expenses > 0 || d.purchases > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">
                  Cash Outflow Trend ({timeRange === '7d' || timeRange === 'week' ? 'Last 7 Days' : timeRange === 'month' ? 'Last 30 Days' : timeRange === 'today' ? 'Today' : 'Over Time'})
                </CardTitle>
                <CardDescription>Daily comparison of operating expenses vs stock procurement</CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTimeRange('7d')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === '7d' || timeRange === 'week' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('month')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'month' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('year')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'year' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Year
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('all')}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  All
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.spendingTrend} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis 
                      width={65}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      tickFormatter={(val) => {
                        if (val >= 1_000_000) return `${currencySymbol}${(val / 1_000_000).toFixed(1)}M`;
                        if (val >= 1_000) return `${currencySymbol}${(val / 1_000).toFixed(1)}k`;
                        return `${currencySymbol}${val}`;
                      }} 
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, undefined]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', borderColor: 'rgba(150,150,150,0.2)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{fill: 'currentColor', opacity: 0.05}}
                    />
                    <Bar dataKey="expenses" name="Operating Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="purchases" name="Stock Procurement" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Expenses by Category</CardTitle>
              <CardDescription>Breakdown of where your money goes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                {chartData.expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, undefined]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid currentColor', borderColor: 'rgba(150,150,150,0.2)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground flex flex-col items-center">
                    <PieChartIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    No expense data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== UNIFIED TABS ======================== */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className={`grid w-full ${canViewPurchasesAndSuppliers ? 'sm:w-[580px] grid-cols-3' : 'sm:w-[200px] grid-cols-1'}`}>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Operating Expenses ({expenses.length})
          </TabsTrigger>
          {canViewPurchasesAndSuppliers && (
            <>
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Stock Purchases ({purchases.length})
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Suppliers ({suppliers.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ============================================================= */}
        {/* TAB 1: OPERATING EXPENSES */}
        {/* ============================================================= */}
        <TabsContent value="expenses" className="space-y-4 pt-2">
          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search expenses, recipient, notes..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2 truncate">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map(c => {
                      const CatIcon = c.icon;
                      return (
                        <SelectItem key={c.id} value={c.id} className="cursor-pointer py-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn("p-1 rounded-md text-xs transition-colors group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white group-data-[highlighted]:border-transparent", c.color)}>
                              <CatIcon className="h-3.5 w-3.5 text-current" />
                            </span>
                            <span className="font-medium group-data-[highlighted]:text-primary-foreground">{c.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Time Period" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/20">
                  <Label htmlFor="drawer-filter" className="text-xs font-medium cursor-pointer">
                    Paid from Drawer
                  </Label>
                  <Switch
                    id="drawer-filter"
                    checked={drawerOnly}
                    onCheckedChange={setDrawerOnly}
                  />
                </div>
                <div className="flex items-center sm:col-span-2 md:col-span-4 justify-end">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportExpenseReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardContent className="p-0">
              {loadingExpenses ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredExpenses.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <h3 className="font-semibold text-lg">No operating expenses found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Record operational shop costs like generator fuel, staff salaries, rent, and packaging to keep track of overheads.
                  </p>
                  <Button onClick={() => { resetExpenseForm(); setIsAddExpenseOpen(true); }} size="sm">
                    <PlusCircle className="h-4 w-4 me-2" />
                    Record First Expense
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Paid To / Recipient</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => {
                      const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                      const CategoryIcon = catInfo?.icon || Tag;
                      const dateObj = safeToDate(exp.date);
                      const formattedDate = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                      return (
                        <TableRow key={exp.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {formattedDate}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div>{exp.title}</div>
                            {exp.notes && <div className="text-xs text-muted-foreground line-clamp-1">{exp.notes}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs font-normal flex items-center gap-1.5 w-fit", catInfo?.color)}>
                              <CategoryIcon className="h-3 w-3" />
                              <span>{catInfo?.label.split('(')[0].trim() || exp.category}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {exp.deductFromCashDrawer && (
                                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300">
                                  Drawer / Till
                                </Badge>
                              )}
                              <span className="capitalize">{exp.paymentMethod.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {exp.recipient || '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground font-mono">
                            {currencySymbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingExpense(exp);
                                  setExpenseTitle(exp.title);
                                  setExpenseAmount(exp.amount.toString());
                                  setExpenseCategory(exp.category);
                                  setExpenseMethod(exp.paymentMethod);
                                  setExpenseDate(safeToDate(exp.date)?.toISOString().split('T')[0] || '');
                                  setExpenseRecipient(exp.recipient || '');
                                  setExpenseNotes(exp.notes || '');
                                  setExpenseDeductDrawer(!!exp.deductFromCashDrawer);
                                  setIsEditExpenseOpen(true);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Expense
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingExpense(exp)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 2: STOCK PURCHASES & PROCUREMENT */}
        {/* ============================================================= */}
        <TabsContent value="purchases" className="space-y-4 pt-2">
          {/* Purchase Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search PO #, supplier, product..."
                    value={searchOrders}
                    onChange={(e) => setSearchOrders(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Order Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Order Statuses</SelectItem>
                    <SelectItem value="ordered">Ordered (Awaiting Receipt)</SelectItem>
                    <SelectItem value="received">Received & Restocked</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Payment Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Statuses</SelectItem>
                    <SelectItem value="paid">Fully Paid</SelectItem>
                    <SelectItem value="partial">Partially Paid</SelectItem>
                    <SelectItem value="pending">Pending / Debt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Purchases Table */}
          <Card>
            <CardContent className="p-0">
              {loadingPurchases ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <Truck className="h-10 w-10 mx-auto text-muted-foreground/50" />
                  <h3 className="font-semibold text-lg">No purchase orders found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create purchase orders when buying stock from distributors or wholesalers. Products will automatically restock into inventory when marked received.
                  </p>
                  <Button onClick={() => { resetOrderForm(); setIsAddOrderOpen(true); }} size="sm">
                    <PlusCircle className="h-4 w-4 me-2" />
                    New Purchase Order
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => {
                      const dateObj = safeToDate(purchase.orderDate);
                      const formattedDate = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                      return (
                        <TableRow key={purchase.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {purchase.poNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {formattedDate}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {purchase.supplierName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {purchase.items?.length || 0} product{(purchase.items?.length || 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            {purchase.status === 'received' && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Received
                              </Badge>
                            )}
                            {purchase.status === 'ordered' && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" /> Ordered
                              </Badge>
                            )}
                            {purchase.status === 'cancelled' && (
                              <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 border-zinc-300 text-xs">
                                Cancelled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {purchase.paymentStatus === 'paid' && (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-xs">
                                Paid
                              </Badge>
                            )}
                            {purchase.paymentStatus === 'partial' && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300 text-xs">
                                Partial
                              </Badge>
                            )}
                            {purchase.paymentStatus === 'pending' && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-300 text-xs">
                                Unpaid (Debt)
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground font-mono">
                            {currencySymbol}{purchase.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {purchase.balanceDue > 0 ? (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {currencySymbol}{purchase.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingPurchase(purchase)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Details & Items
                                </DropdownMenuItem>

                                {purchase.status === 'ordered' && (
                                  <DropdownMenuItem onClick={() => setReceivingPurchase(purchase)} className="text-emerald-600 focus:text-emerald-600">
                                    <Boxes className="h-4 w-4 mr-2" />
                                    Mark as Received & Restock
                                  </DropdownMenuItem>
                                )}

                                {purchase.balanceDue > 0 && (
                                  <DropdownMenuItem onClick={() => {
                                    setPayingPurchase(purchase);
                                    setPayAmount(purchase.balanceDue.toString());
                                  }}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => setDeletingPurchase(purchase)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Order
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 3: SUPPLIERS DIRECTORY */}
        {/* ============================================================= */}
        <TabsContent value="suppliers" className="space-y-4 pt-2">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor name, contact, phone..."
                value={searchSuppliers}
                onChange={(e) => setSearchSuppliers(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsAddSupplierOpen(true)}>
              <PlusCircle className="h-4 w-4 me-2" />
              Add New Supplier
            </Button>
          </div>

          {/* Suppliers Grid */}
          {loadingSuppliers ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 px-4 space-y-3">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <h3 className="font-semibold text-lg">No suppliers found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Add wholesalers, distributors, and vendors you buy inventory from to track purchase histories and outstanding debt.
                </p>
                <Button onClick={() => setIsAddSupplierOpen(true)} size="sm">
                  <PlusCircle className="h-4 w-4 me-2" />
                  Add First Supplier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:border-primary/40 transition-colors shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          {supplier.name}
                        </CardTitle>
                        {supplier.contactPerson && (
                          <CardDescription className="text-xs">
                            Contact: {supplier.contactPerson}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {supplier.paymentTerms || 'Immediate'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="space-y-1 text-muted-foreground">
                      {supplier.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="line-clamp-1">{supplier.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-3 grid grid-cols-2 gap-2 text-center bg-muted/20 p-2 rounded-md">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Total Purchased</span>
                        <p className="font-bold text-sm text-foreground">
                          {currencySymbol}{(supplier.totalPurchased || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Balance Owed</span>
                        <p className={cn("font-bold text-sm", (supplier.totalDebt || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          {currencySymbol}{(supplier.totalDebt || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ======================== MODAL: RECORD EXPENSE ======================== */}
      <Dialog open={isAddExpenseOpen || isEditExpenseOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddExpenseOpen(false);
          setIsEditExpenseOpen(false);
          setEditingExpense(null);
        }
      }}>
        <DialogContent className="sm:max-w-[650px] p-6 rounded-xl border border-border shadow-2xl">
          <form onSubmit={handleCreateExpense}>
            <DialogHeader className="pb-2 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    {isEditExpenseOpen ? 'Edit Operating Expense' : 'Record Operating Expense'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Log overhead expenses, utility bills, maintenance, salaries, or petty cash paid from the till.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expense Title */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="title" className="text-xs font-semibold text-foreground/90">
                    Expense Description / Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    required
                    placeholder="e.g. Generator Petrol, Shop Rent, Packaging Bags"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="h-10 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-semibold text-foreground/90">
                    Amount ({currencySymbol}) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground select-none">
                      {currencySymbol}
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="h-10 text-sm pl-7 rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Date Incurred */}
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-xs font-semibold text-foreground/90">
                    Date Incurred <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="h-10 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-foreground/90">
                    Category <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={expenseCategory} onValueChange={(v: any) => setExpenseCategory(v)}>
                    <SelectTrigger id="category" className="h-10 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {EXPENSE_CATEGORIES.map(c => {
                        const CatIcon = c.icon;
                        return (
                          <SelectItem key={c.id} value={c.id} className="cursor-pointer py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={cn("p-1 rounded-md text-xs transition-colors group-data-[highlighted]:bg-white/20 group-data-[highlighted]:text-white group-data-[highlighted]:border-transparent", c.color)}>
                                <CatIcon className="h-3.5 w-3.5 text-current" />
                              </span>
                              <span className="font-medium group-data-[highlighted]:text-primary-foreground">{c.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="method" className="text-xs font-semibold text-foreground/90">
                    Payment Method <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={expenseMethod} onValueChange={(v: any) => setExpenseMethod(v)}>
                    <SelectTrigger id="method" className="h-10 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.id} value={m.id} className="cursor-pointer py-2 text-xs font-medium">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="recipient" className="text-xs font-semibold text-foreground/90">
                    Paid To / Recipient <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="recipient"
                    placeholder="e.g. Filling Station, Landlord, Delivery Driver"
                    value={expenseRecipient}
                    onChange={(e) => setExpenseRecipient(e.target.value)}
                    className="h-10 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors"
                  />
                </div>

                {/* Cash Drawer Deduction Toggle */}
                {expenseMethod === 'cash' && (
                  <div className="sm:col-span-2 flex items-center justify-between p-3.5 border rounded-xl bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20 hover:bg-amber-500/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="deduct-drawer" className="font-semibold text-xs cursor-pointer text-amber-950 dark:text-amber-200">
                          Deduct from Cash Drawer / Till
                        </Label>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                          Subtract this cash expense from daily register balance reconciliation.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="deduct-drawer"
                      checked={expenseDeductDrawer}
                      onCheckedChange={setExpenseDeductDrawer}
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notes" className="text-xs font-semibold text-foreground/90">
                    Notes / Reference <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add receipt number, invoice reference or context..."
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="resize-none h-20 text-sm rounded-lg bg-muted/20 hover:bg-muted/40 hover:text-foreground text-foreground transition-colors"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => { setIsAddExpenseOpen(false); setIsEditExpenseOpen(false); }}
                className="h-10 px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-10 px-5 text-xs font-semibold shadow-md">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditExpenseOpen ? 'Save Changes' : 'Record Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================== MODAL: NEW PURCHASE ORDER ======================== */}
      <Dialog open={isAddOrderOpen} onOpenChange={setIsAddOrderOpen}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <form onSubmit={handleCreatePurchaseOrder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                New Purchase Order & Restock Bill
              </DialogTitle>
              <DialogDescription>
                Record stock ordered from suppliers. When marked received, items will automatically restock into inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="order-supplier">Supplier *</Label>
                    <button
                      type="button"
                      onClick={() => setIsAddSupplierOpen(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      + Add New
                    </button>
                  </div>
                  <Select value={orderSupplierId} onValueChange={setOrderSupplierId}>
                    <SelectTrigger id="order-supplier">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="order-date">Order Date *</Label>
                  <Input
                    id="order-date"
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="delivery-date">Expected Delivery (Optional)</Label>
                  <Input
                    id="delivery-date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Product Line Items */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Product Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItem}>
                    <PlusCircle className="h-3.5 w-3.5 mr-1 text-primary" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded-md border text-xs">
                      <div className="col-span-5">
                        <Label className="text-[10px] text-muted-foreground">Product</Label>
                        <Combobox
                          options={(products || []).map(p => ({
                            value: p.id,
                            label: `${p.name}${p.sku ? ` [${p.sku}]` : ''} (Stock: ${p.stock ?? 0})`
                          }))}
                          value={item.productId}
                          onChange={(val) => handleOrderItemChange(idx, 'productId', val)}
                          placeholder="Pick inventory item"
                          searchPlaceholder="Search product or SKU..."
                          triggerClassName="h-8 text-xs font-normal"
                          allowDeselect={false}
                          modal={true}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-center"
                          value={item.quantityOrdered}
                          onChange={(e) => handleOrderItemChange(idx, 'quantityOrdered', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Unit Cost ({currencySymbol})</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          className="h-8"
                          value={item.unitCost}
                          onChange={(e) => handleOrderItemChange(idx, 'unitCost', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2 text-right">
                        <Label className="text-[10px] text-muted-foreground">Total Cost</Label>
                        <div className="font-bold text-foreground truncate">
                          {currencySymbol}{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="col-span-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveOrderItem(idx)}
                          disabled={orderItems.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-medium">Total Bill: </span>
                    <span className="text-lg font-bold text-foreground">
                      {currencySymbol}{orderCalculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment & Auto Restock Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="amount-paid">Initial Amount Paid ({currencySymbol})</Label>
                  <Input
                    id="amount-paid"
                    type="number"
                    step="any"
                    min="0"
                    max={orderCalculatedTotal}
                    placeholder="0.00"
                    value={orderAmountPaid}
                    onChange={(e) => setOrderAmountPaid(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Balance Due: {currencySymbol}{Math.max(0, orderCalculatedTotal - (parseFloat(orderAmountPaid) || 0)).toLocaleString()} (Debt)
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="payment-method">Payment Method</Label>
                  <Select value={orderPaymentMethod} onValueChange={(v: any) => setOrderPaymentMethod(v)}>
                    <SelectTrigger id="payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 text-xs">
                <div>
                  <p className="font-semibold text-foreground">Auto-Restock on Receipt</p>
                  <p className="text-muted-foreground">Automatically increment stock quantities when this order is marked received.</p>
                </div>
                <Switch checked={autoRestock} onCheckedChange={setAutoRestock} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOrderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================== MODAL: ADD SUPPLIER ======================== */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateSupplier}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Add New Supplier / Wholesaler
              </DialogTitle>
              <DialogDescription>
                Register vendor details for purchasing inventory and tracking supplier debt.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="sup-name">Company / Supplier Name *</Label>
                <Input
                  id="sup-name"
                  required
                  placeholder="e.g. Alaba Wholesale Ltd, Dangote Depot"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sup-contact">Contact Person</Label>
                  <Input
                    id="sup-contact"
                    placeholder="e.g. Alhaji Musa"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sup-phone">Phone Number</Label>
                  <Input
                    id="sup-phone"
                    placeholder="080..."
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-email">Email Address</Label>
                <Input
                  id="sup-email"
                  type="email"
                  placeholder="vendor@company.com"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-address">Shop / Warehouse Address</Label>
                <Input
                  id="sup-address"
                  placeholder="e.g. Shop 12, Main Market"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sup-terms">Payment Terms</Label>
                <Select value={supplierTerms} onValueChange={setSupplierTerms}>
                  <SelectTrigger id="sup-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Immediate">Immediate / Cash on Delivery</SelectItem>
                    <SelectItem value="Net 7">Net 7 Days</SelectItem>
                    <SelectItem value="Net 14">Net 14 Days</SelectItem>
                    <SelectItem value="Net 30">Net 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================== MODAL: ORDER DETAILS & ITEMS ======================== */}
      {viewingPurchase && (
        <Dialog open={!!viewingPurchase} onOpenChange={(open) => { if (!open) setViewingPurchase(null); }}>
          <DialogContent className="max-w-2xl w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  Order {viewingPurchase.poNumber}
                </span>
                <Badge variant="outline" className="capitalize">
                  {viewingPurchase.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Supplier: {viewingPurchase.supplierName} • Ordered on {safeToDate(viewingPurchase.orderDate)?.toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingPurchase.items?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-xs">{item.productName}</TableCell>
                      <TableCell className="text-center text-xs font-mono">{item.quantityOrdered}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{currencySymbol}{item.unitCost?.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-bold font-mono">{currencySymbol}{item.totalCost?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <p className="text-muted-foreground">Amount Paid: <span className="font-bold text-foreground">{currencySymbol}{viewingPurchase.amountPaid?.toLocaleString()}</span></p>
                  <p className="text-muted-foreground">Balance Due: <span className="font-bold text-rose-600">{currencySymbol}{viewingPurchase.balanceDue?.toLocaleString()}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground uppercase text-[10px]">Total Order</span>
                  <p className="text-lg font-bold text-foreground">{currencySymbol}{viewingPurchase.totalAmount?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingPurchase(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================== MODAL: RECORD PAYMENT ======================== */}
      {payingPurchase && (
        <Dialog open={!!payingPurchase} onOpenChange={(open) => { if (!open) setPayingPurchase(null); }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Record Payment
              </DialogTitle>
              <DialogDescription>
                Pay outstanding debt for {payingPurchase.poNumber} ({payingPurchase.supplierName}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Bill:</span>
                  <span className="font-bold">{currencySymbol}{payingPurchase.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-bold text-emerald-600">{currencySymbol}{payingPurchase.amountPaid?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground font-semibold">Remaining Debt:</span>
                  <span className="font-bold text-rose-600">{currencySymbol}{payingPurchase.balanceDue?.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-amt">Amount to Pay ({currencySymbol})</Label>
                <Input
                  id="pay-amt"
                  type="number"
                  step="any"
                  max={payingPurchase.balanceDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pay-meth">Payment Method</Label>
                <Select value={payMethod} onValueChange={(v: any) => setPayMethod(v)}>
                  <SelectTrigger id="pay-meth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPayingPurchase(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleRecordOrderPayment(payingPurchase)} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================== ALERT: CONFIRM RECEIVE & RESTOCK ======================== */}
      <AlertDialog open={!!receivingPurchase} onOpenChange={(open) => { if (!open) setReceivingPurchase(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-emerald-600" />
              Restock Inventory from Order?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark order <span className="font-bold font-mono">{receivingPurchase?.poNumber}</span> as received and automatically increment stock levels for all {receivingPurchase?.items?.length || 0} product line items in inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => receivingPurchase && handleReceivePurchaseOrder(receivingPurchase)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Restock Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== ALERT: DELETE EXPENSE ======================== */}
      <AlertDialog open={!!deletingExpense} onOpenChange={(open) => { if (!open) setDeletingExpense(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-bold">{deletingExpense?.title}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive hover:bg-destructive/90 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== DRILL-DOWN KPI MODAL ======================== */}
      {selectedKpiModal && (
        <Dialog open={!!selectedKpiModal} onOpenChange={(open) => { if (!open) setSelectedKpiModal(null); }}>
          <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Wallet className="h-5 w-5 text-primary" />
                {selectedKpiModal.title}
              </DialogTitle>
              <DialogDescription>
                {selectedKpiModal.description}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="relative px-1 pt-1 pb-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search breakdown records..."
                  className="pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 shadow-xs"
                  value={kpiModalSearch}
                  onChange={(e) => setKpiModalSearch(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md">
                {(() => {
                  const q = kpiModalSearch.toLowerCase().trim();
                  const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

                  if (selectedKpiModal.id === 'total_outflow') {
                    // Unified timeline of expenses + purchases
                    const combinedList: { id: string; date: Date | null; type: 'expense' | 'purchase'; title: string; subtitle: string; amount: number; badge: string; raw: any }[] = [];
                    
                    expenses.forEach(e => {
                      combinedList.push({
                        id: `exp-${e.id}`,
                        date: safeToDate(e.date),
                        type: 'expense',
                        title: e.title,
                        subtitle: `Category: ${EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category}`,
                        amount: Number(e.amount) || 0,
                        badge: e.paymentMethod.replace('_', ' '),
                        raw: e,
                      });
                    });

                    purchases.forEach(p => {
                      combinedList.push({
                        id: `pur-${p.id}`,
                        date: safeToDate(p.orderDate),
                        type: 'purchase',
                        title: `Stock Procurement (${p.poNumber})`,
                        subtitle: `Supplier: ${p.supplierName} (${p.items?.length || 0} items)`,
                        amount: Number(p.totalAmount) || 0,
                        badge: p.status,
                        raw: p,
                      });
                    });

                    combinedList.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

                    const filtered = combinedList.filter(item => 
                      !q || item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.badge.toLowerCase().includes(q)
                    );

                    if (filtered.length === 0) {
                      return <div className="p-8 text-center text-xs text-muted-foreground">No records found matching your query.</div>;
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Details</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <Badge variant="outline" className={item.type === 'expense' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}>
                                  {item.type === 'expense' ? 'Expense' : 'Procurement'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {item.date ? format(item.date, 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell className="font-medium text-xs">{item.title}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.subtitle}</TableCell>
                              <TableCell className="text-xs text-right font-bold font-mono">
                                {currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  }

                  if (selectedKpiModal.id === 'operating_overheads' || selectedKpiModal.id === 'month_expenses' || selectedKpiModal.id === 'drawer_outflow') {
                    let expList = expenses;
                    if (selectedKpiModal.id === 'month_expenses') {
                      expList = expList.filter(e => (safeToDate(e.date) || new Date(0)) >= startOfThisMonth);
                    } else if (selectedKpiModal.id === 'drawer_outflow') {
                      expList = expList.filter(e => e.deductFromCashDrawer);
                    }

                    const filtered = expList.filter(e =>
                      !q || e.title.toLowerCase().includes(q) || (e.recipient || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
                    );

                    if (filtered.length === 0) {
                      return <div className="p-8 text-center text-xs text-muted-foreground">No expenses found for this criteria.</div>;
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Expense Title</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs">Payment Method</TableHead>
                            <TableHead className="text-xs">Recipient</TableHead>
                            <TableHead className="text-xs text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(e => {
                            const catLabel = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
                            const d = safeToDate(e.date);
                            return (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  {d ? format(d, 'MMM d, yyyy') : 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-xs">{e.title}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="secondary" className="font-normal text-[11px]">{catLabel}</Badge>
                                </TableCell>
                                <TableCell className="text-xs capitalize">
                                  {e.paymentMethod.replace('_', ' ')}
                                  {e.deductFromCashDrawer && <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Drawer</Badge>}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.recipient || '-'}</TableCell>
                                <TableCell className="text-xs text-right font-bold font-mono text-amber-600 dark:text-amber-400">
                                  {currencySymbol}{Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    );
                  }

                  if (selectedKpiModal.id === 'stock_procurement' || selectedKpiModal.id === 'paid_suppliers' || selectedKpiModal.id === 'accounts_payable') {
                    let poList = purchases;
                    if (selectedKpiModal.id === 'paid_suppliers') {
                      poList = poList.filter(p => p.paymentStatus === 'paid' || p.amountPaid > 0);
                    } else if (selectedKpiModal.id === 'accounts_payable') {
                      poList = poList.filter(p => (p.balanceDue || 0) > 0);
                    }

                    const filtered = poList.filter(p =>
                      !q || p.poNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q) || p.items?.some(i => i.productName.toLowerCase().includes(q))
                    );

                    if (filtered.length === 0) {
                      return <div className="p-8 text-center text-xs text-muted-foreground">No purchase orders found.</div>;
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">PO Number</TableHead>
                            <TableHead className="text-xs">Order Date</TableHead>
                            <TableHead className="text-xs">Supplier</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs text-right">Total Bill</TableHead>
                            <TableHead className="text-xs text-right">Amount Paid</TableHead>
                            <TableHead className="text-xs text-right">Balance Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(p => {
                            const d = safeToDate(p.orderDate);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-mono text-xs font-semibold">{p.poNumber}</TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground">
                                  {d ? format(d, 'MMM d, yyyy') : 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-xs">{p.supplierName}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "capitalize text-[10px]",
                                      p.status === 'received' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                                      p.status === 'ordered' && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                      p.status === 'cancelled' && "bg-destructive/10 text-destructive border-destructive/20"
                                    )}
                                  >
                                    {p.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono font-medium">
                                  {currencySymbol}{Number(p.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono text-emerald-600 dark:text-emerald-400">
                                  {currencySymbol}{Number(p.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                  {currencySymbol}{Number(p.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    );
                  }

                  if (selectedKpiModal.id === 'suppliers') {
                    const filtered = suppliers.filter(s =>
                      !q || s.name.toLowerCase().includes(q) || (s.contactPerson || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q)
                    );

                    if (filtered.length === 0) {
                      return <div className="p-8 text-center text-xs text-muted-foreground">No suppliers found.</div>;
                    }

                    return (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Supplier Name</TableHead>
                            <TableHead className="text-xs">Contact Person</TableHead>
                            <TableHead className="text-xs">Phone / Email</TableHead>
                            <TableHead className="text-xs">Payment Terms</TableHead>
                            <TableHead className="text-xs text-right">Total Purchased</TableHead>
                            <TableHead className="text-xs text-right">Debt Owed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium text-xs">{s.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.contactPerson || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.phone || s.email || '-'}</TableCell>
                              <TableCell className="text-xs">{s.paymentTerms || 'Immediate'}</TableCell>
                              <TableCell className="text-xs text-right font-mono font-medium">
                                {currencySymbol}{Number(s.totalPurchased || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                {currencySymbol}{Number(s.totalDebt || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  }

                  return null;
                })()}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button variant="outline" onClick={() => setSelectedKpiModal(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function ExpensesAndPurchasesPage() {
  return (
    <React.Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading Expenses & Purchases...</p>
        </div>
      </div>
    }>
      <ExpensesAndPurchasesContent />
    </React.Suspense>
  );
}
