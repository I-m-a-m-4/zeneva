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
  LayoutDashboard,
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
  Check,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ArrowDownRight,
  Boxes,
  Sparkles,
  Printer,
} from "lucide-react";
import { usePOS } from '@/context/pos-context';
import { isCoreFeatureBlocked } from '@/lib/plan';
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
import type { Expense, ExpenseCategory, ExpensePaymentMethod, ExpenseDeductionSource } from '@/types';
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
  getDocs,
  setDoc,
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

export const DEDUCTION_SOURCES: { id: ExpenseDeductionSource; label: string; shortLabel: string; description: string }[] = [
  {
    id: 'revenue',
    label: 'Operational Overhead (Deduct from Profit)',
    shortLabel: 'Operating',
    description: 'Standard business expense deducted from operating profit. Never reduces sales revenue.'
  },
  {
    id: 'net_profit',
    label: 'Net Profit Reinvestment',
    shortLabel: 'Net Profit',
    description: 'Funded from retained profit/equity. Deducted from net profit as reinvestment.'
  },
  {
    id: 'excluded',
    label: 'Excluded (Do Not Deduct from Profit)',
    shortLabel: 'Excluded',
    description: 'Capital assets, personal drawings, or stock purchases excluded from profit and loss calculations.'
  }
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
  deductionSource?: ExpenseDeductionSource;
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

// ======================== DATE RANGE HELPER ========================

function isDateInRange(rawDate: any, range: string, startCustom?: string, endCustom?: string): boolean {
  if (range === 'all') return true;
  const d = safeToDate(rawDate);
  if (!d) return false;
  const now = new Date();

  if (range === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return d >= start && d <= end;
  }
  if (range === 'yesterday') {
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const endYest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return d >= yest && d <= endYest;
  }
  if (range === 'this_week') {
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0);
    return d >= monday;
  }
  if (range === 'last_7_days' || range === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= sevenDaysAgo;
  }
  if (range === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return d >= startOfMonth;
  }
  if (range === 'last_30_days' || range === 'month') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d >= thirtyDaysAgo;
  }
  if (range === 'last_month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  }
  if (range === 'this_quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
    return d >= startOfQuarter;
  }
  if (range === 'this_year' || range === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    return d >= startOfYear;
  }
  if (range === 'custom') {
    if (startCustom) {
      const s = new Date(startCustom + 'T00:00:00');
      if (d < s) return false;
    }
    if (endCustom) {
      const e = new Date(endCustom + 'T23:59:59.999');
      if (d > e) return false;
    }
    return true;
  }
  return true;
}

// ======================== MAIN UNIFIED HUB ========================

function ExpensesAndPurchasesContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');

  const { business, currentUserProfile, products, isReadOnly } = usePOS();
  const isReadOnlyStore = isReadOnly || (business ? isCoreFeatureBlocked(business) : false);
  
  const canViewPurchasesAndSuppliers = currentUserProfile?.role !== 'vendor_operator';
  const firestore = useFirestore();
  const { toast } = useToast();

  const currencySymbol = business?.currency ? (CURRENCY_SYMBOLS[business.currency] || business.currency) : '₦';

  // Active Main Tab: 'dashboard' | 'expenses' | 'purchases' | 'suppliers'
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'expenses' | 'purchases' | 'suppliers'>(
    initialTabParam === 'purchases' || initialTabParam === 'suppliers' || initialTabParam === 'expenses'
      ? initialTabParam
      : 'dashboard'
  );

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'purchases' || tab === 'suppliers' || tab === 'expenses' || tab === 'dashboard') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: 'dashboard' | 'expenses' | 'purchases' | 'suppliers') => {
    setActiveTab(val);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', val);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // -------------------------------------------------------------
  // DATA STATES: EXPENSES
  // -------------------------------------------------------------
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = React.useState(true);

  // Expense Filters
  const [expenseSearch, setExpenseSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedMethod, setSelectedMethod] = React.useState<string>('all');
  const [expenseSourceFilter, setExpenseSourceFilter] = React.useState<string>('all');
  const [timeRange, setTimeRange] = React.useState<string>('this_month');
  const [customStartDate, setCustomStartDate] = React.useState<string>('');
  const [customEndDate, setCustomEndDate] = React.useState<string>('');
  const [drawerOnly, setDrawerOnly] = React.useState(false);

  // Selected Expense Detail Modal State
  const [selectedExpenseDetail, setSelectedExpenseDetail] = React.useState<Expense | null>(null);

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
  const [purchaseSourceFilter, setPurchaseSourceFilter] = React.useState<string>('all');
  const [purchaseTimeRange, setPurchaseTimeRange] = React.useState<string>('all');
  const [purchaseCustomStartDate, setPurchaseCustomStartDate] = React.useState<string>('');
  const [purchaseCustomEndDate, setPurchaseCustomEndDate] = React.useState<string>('');
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
  const [expenseDeductionSource, setExpenseDeductionSource] = React.useState<ExpenseDeductionSource>('revenue');
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
  const [orderDeductionSource, setOrderDeductionSource] = React.useState<ExpenseDeductionSource>('revenue');
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
  const [payDeductionSource, setPayDeductionSource] = React.useState<ExpenseDeductionSource>('revenue');

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

    const isPurchase = (e: any) =>
      e.category === 'supplier_payment' ||
      e.category === 'procurement' ||
      e.category === 'inventory_procurement';

    // True Operating Expenses (Rent, Utilities, Staff, Logistics, Maintenance, etc. - excluding inventory purchases)
    const operatingExpensesList = expenses.filter(e => !isPurchase(e));
    const totalOperatingExpenses = operatingExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expensesFromDrawer = operatingExpensesList.filter(e => e.deductFromCashDrawer).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthExpenses = operatingExpensesList.filter(e => safeToDate(e.date) >= startOfThisMonth).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Filtered Purchases (Inventory Procurement)
    const totalProcurement = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const totalPurchasesPaid = purchases.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const totalSupplierDebt = purchases.reduce((sum, p) => sum + (Number(p.balanceDue) || 0), 0);

    // Source Breakdown: Operating vs Net Profit Reinvestment vs Excluded
    const expensesFromProfit = operatingExpensesList.filter(e => e.deductionSource === 'net_profit').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expensesFromRevenue = operatingExpensesList.filter(e => !e.deductionSource || e.deductionSource === 'revenue').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const expensesExcluded = operatingExpensesList.filter(e => e.deductionSource === 'excluded').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const purchasesFromProfit = purchases.filter(p => p.deductionSource === 'net_profit').reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const purchasesFromRevenue = purchases.filter(p => !p.deductionSource || p.deductionSource === 'revenue').reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    const purchasesExcluded = purchases.filter(p => p.deductionSource === 'excluded').reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

    const totalProfitReinvested = expensesFromProfit + purchasesFromProfit;
    const totalFromRevenue = expensesFromRevenue + purchasesFromRevenue;
    const totalExcludedOutflows = expensesExcluded + purchasesExcluded;

    // Combined Cash Outflow (Operating Expenses + Paid Restock Procurement)
    const combinedOutflow = totalOperatingExpenses + totalPurchasesPaid;

    return {
      totalExpenses: totalOperatingExpenses,
      totalOperatingExpenses,
      expensesFromDrawer,
      monthExpenses,
      totalProcurement,
      totalPurchasesPaid,
      totalSupplierDebt,
      combinedOutflow,
      expensesFromProfit,
      expensesFromRevenue,
      purchasesFromProfit,
      purchasesFromRevenue,
      totalProfitReinvested,
      totalFromRevenue,
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

      if (expenseSourceFilter !== 'all') {
        const source = exp.deductionSource || 'revenue';
        if (source !== expenseSourceFilter) return false;
      }

      if (!isDateInRange(exp.date, timeRange, customStartDate, customEndDate)) {
        return false;
      }

      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const matchesTitle = (exp.title || '').toLowerCase().includes(q);
        const matchesRecipient = (exp.recipient || '').toLowerCase().includes(q);
        const matchesNotes = (exp.notes || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesRecipient && !matchesNotes) return false;
      }

      return true;
    });
  }, [expenses, selectedCategory, selectedMethod, expenseSourceFilter, timeRange, customStartDate, customEndDate, drawerOnly, expenseSearch]);

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
      const timeLabel = timeRange === 'custom' 
        ? `Custom Range (${customStartDate || 'Start'} to ${customEndDate || 'Now'})` 
        : timeRange.replace(/_/g, ' ');
      doc.text(`Time Period: ${timeLabel.charAt(0).toUpperCase() + timeLabel.slice(1)}`, 14, 36);
    }

    const tableColumn = ["Date", "Title", "Category", "Funding Source", "Payment Method", "Recipient", "Amount"];
    
    const tableRows = filteredExpenses.map(exp => {
      const dateObj = safeToDate(exp.date);
      const formattedDate = dateObj ? format(dateObj, 'MMM d, yyyy') : 'N/A';
      
      const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
      const catName = catInfo?.label.split('(')[0].trim() || exp.category;
      
      const methodStr = exp.paymentMethod.replace('_', ' ');
      const methodCap = methodStr.charAt(0).toUpperCase() + methodStr.slice(1);
      const sourceStr = exp.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue';
      
      return [
        formattedDate,
        exp.title,
        catName,
        sourceStr,
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

  const handleDownloadExpenseVoucherPDF = (expense: Expense) => {
    try {
      const doc = new jsPDF();
      const dateObj = safeToDate(expense.date);
      const formattedDate = dateObj ? format(dateObj, 'EEEE, MMMM d, yyyy') : 'N/A';
      const formattedTime = dateObj ? format(dateObj, 'h:mm a') : '';
      const catInfo = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
      const catName = catInfo?.label.split('(')[0].trim() || expense.category;
      const voucherNo = (expense.id ? expense.id.slice(-8) : 'EXP').toUpperCase();

      // Top Brand Stripe
      doc.setFillColor(249, 115, 22); // Orange primary
      doc.rect(0, 0, 210, 6, 'F');

      // Business Header
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(business?.name || "Zeneva POS", 14, 20);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      if (business?.address) doc.text(business.address, 14, 26);
      if (business?.phone) doc.text(`Phone: ${business.phone}`, 14, 31);

      // Voucher Title & Reference (Right Aligned)
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12);
      doc.text("EXPENSE PAYMENT VOUCHER", 196, 20, { align: 'right' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Voucher Ref: #${voucherNo}`, 196, 26, { align: 'right' });
      doc.text(`Date: ${formattedDate}`, 196, 31, { align: 'right' });
      if (formattedTime) doc.text(`Time: ${formattedTime}`, 196, 36, { align: 'right' });

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 40, 196, 40);

      // Total Amount Highlight Box
      doc.setFillColor(255, 247, 237); // orange-50
      doc.setDrawColor(254, 215, 170); // orange-200
      doc.roundedRect(14, 45, 182, 22, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12);
      doc.text("TOTAL AMOUNT DISBURSED", 20, 52);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${currencySymbol}${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, 62);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text("DISBURSED / SETTLED", 190, 58, { align: 'right' });

      // Breakdown Table
      const tableData = [
        ["Expense Title / Description", expense.title || expense.description || "Operational Expense"],
        ["Category", catName],
        ["Paid To / Beneficiary", expense.recipient || "— (Internal / Operations)"],
        ["Payment Method", expense.paymentMethod.replace('_', ' ').toUpperCase()],
        ["Funding & Deduction Source", expense.deductionSource === 'net_profit' ? "Net Profit Reinvestment (Profit / Equity)" : "Operational Gross Revenue (Day-to-day Sales Revenue)"],
        ["Cash Drawer / Till Outflow", expense.deductFromCashDrawer ? "Yes (Deducted directly from daily POS register)" : "No (External bank account / card)"],
        ["Recorded By / Staff", expense.createdByName || expense.paidBy || "Staff / Administrator"],
      ];

      if (expense.notes) {
        tableData.push(["Notes / Remarks", expense.notes]);
      }

      autoTable(doc, {
        startY: 72,
        head: [["Disbursement Field", "Record Details"]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold',
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold', textColor: [51, 65, 85] },
          1: { textColor: [15, 23, 42] },
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 18 : 170;

      // Signatures Section
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, finalY + 18, 75, finalY + 18);
      doc.text("Disbursed / Prepared By", 14, finalY + 23);

      doc.line(135, finalY + 18, 196, finalY + 18);
      doc.text("Received / Authorized By", 135, finalY + 23);

      // Footer note
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated by Zeneva Business Suite on ${format(new Date(), 'PPpp')}. Official payment disbursement voucher.`,
        105,
        285,
        { align: 'center' }
      );

      doc.save(`expense-voucher-${voucherNo}.pdf`);
      toast({
        title: "Voucher Downloaded",
        description: `Expense voucher #${voucherNo} saved successfully.`,
      });
    } catch (err: any) {
      console.error("Failed to generate voucher PDF", err);
      toast({
        title: "Export Failed",
        description: "Could not generate voucher PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // -------------------------------------------------------------
  // FILTERED PURCHASES
  // -------------------------------------------------------------
  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(p => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && p.paymentStatus !== paymentFilter) return false;

      if (purchaseSourceFilter !== 'all') {
        const source = p.deductionSource || 'revenue';
        if (source !== purchaseSourceFilter) return false;
      }

      if (!isDateInRange(p.orderDate, purchaseTimeRange, purchaseCustomStartDate, purchaseCustomEndDate)) {
        return false;
      }

      if (searchOrders.trim()) {
        const q = searchOrders.toLowerCase();
        const matchesPo = (p.poNumber || '').toLowerCase().includes(q);
        const matchesSup = (p.supplierName || '').toLowerCase().includes(q);
        const matchesItem = p.items?.some(i => i.productName.toLowerCase().includes(q));
        if (!matchesPo && !matchesSup && !matchesItem) return false;
      }
      return true;
    });
  }, [purchases, statusFilter, paymentFilter, purchaseSourceFilter, purchaseTimeRange, purchaseCustomStartDate, purchaseCustomEndDate, searchOrders]);

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
    setExpenseDeductionSource('revenue');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseRecipient('');
    setExpenseNotes('');
    setExpenseDeductDrawer(true);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !business?.id) return;
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Please upgrade to record expenses.',
        variant: 'destructive',
      });
      return;
    }
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
        deductionSource: expenseDeductionSource,
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
          deductionSource: payload.deductionSource,
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
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Modifications are disabled.',
        variant: 'destructive',
      });
      return;
    }
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
    setOrderDeductionSource('revenue');
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
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Please upgrade to create purchase orders.',
        variant: 'destructive',
      });
      return;
    }

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
        deductionSource: orderDeductionSource,
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
          deductionSource: orderDeductionSource,
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
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Stock updates are disabled in read-only mode.',
        variant: 'destructive',
      });
      return;
    }
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
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Payment recordings are disabled in read-only mode.',
        variant: 'destructive',
      });
      return;
    }
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
        deductionSource: payDeductionSource,
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
          deductionSource: payDeductionSource,
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

  const handleDeletePurchaseOrder = async () => {
    if (!firestore || !business?.id || !deletingPurchase) return;
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Deletions are disabled in read-only mode.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Delete purchase order doc from supplier_purchases
      await deleteDoc(doc(firestore, 'supplier_purchases', deletingPurchase.id)).catch((err) => {
        console.warn('Could not delete from supplier_purchases:', err);
      });

      // 2. Also delete from legacy/subcollection purchaseOrders if present
      await deleteDoc(doc(firestore, 'businessInstances', business.id, 'purchaseOrders', deletingPurchase.id)).catch(() => {});

      // 3. Search and delete any matching purchase order by poNumber in both places
      if (deletingPurchase.poNumber) {
        try {
          const poSnap = await getDocs(query(
            collection(firestore, 'businessInstances', business.id, 'purchaseOrders'),
            where('purchaseNumber', '==', deletingPurchase.poNumber)
          ));
          for (const d of poSnap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        } catch (e) {}

        try {
          const spSnap = await getDocs(query(
            collection(firestore, 'supplier_purchases'),
            where('businessId', '==', business.id),
            where('poNumber', '==', deletingPurchase.poNumber)
          ));
          for (const d of spSnap.docs) {
            if (d.id !== deletingPurchase.id) {
              await deleteDoc(d.ref).catch(() => {});
            }
          }
        } catch (e) {}
      }

      // 4. Query and delete associated expenses that were auto-created for this purchase order
      // (This directly cleans up supplier payment expenses affecting net profit)
      if (deletingPurchase.poNumber) {
        try {
          const expQuery = query(
            collection(firestore, 'expenses'),
            where('businessId', '==', business.id),
            where('referenceId', '==', deletingPurchase.poNumber)
          );
          const expSnap = await getDocs(expQuery);
          for (const d of expSnap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        } catch (e) {}
      }

      if (deletingPurchase.id && deletingPurchase.id !== deletingPurchase.poNumber) {
        try {
          const expQuery2 = query(
            collection(firestore, 'expenses'),
            where('businessId', '==', business.id),
            where('referenceId', '==', deletingPurchase.id)
          );
          const expSnap2 = await getDocs(expQuery2);
          for (const d of expSnap2.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        } catch (e) {}
      }

      // 5. Rollback supplier totals (totalPurchased & totalDebt)
      if (deletingPurchase.supplierId) {
        try {
          const supplierRef = doc(firestore, 'suppliers', deletingPurchase.supplierId);
          await updateDoc(supplierRef, {
            totalPurchased: increment(-(deletingPurchase.totalAmount || 0)),
            totalDebt: increment(-(deletingPurchase.balanceDue || 0)),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          try {
            const subSupRef = doc(firestore, 'businessInstances', business.id, 'suppliers', deletingPurchase.supplierId);
            await updateDoc(subSupRef, {
              totalPurchased: increment(-(deletingPurchase.totalAmount || 0)),
              totalDebt: increment(-(deletingPurchase.balanceDue || 0)),
              updatedAt: serverTimestamp(),
            });
          } catch (e2) {}
        }
      }

      // 6. If the order was marked received and autoRestock was true, revert product stock
      if (deletingPurchase.status === 'received' && deletingPurchase.autoRestock !== false && deletingPurchase.items?.length > 0) {
        for (const item of deletingPurchase.items) {
          if (item.productId) {
            const qtyToRevert = item.quantityReceived || item.quantityOrdered || 0;
            if (qtyToRevert > 0) {
              try {
                const productRef = doc(firestore, 'products', item.productId);
                await updateDoc(productRef, {
                  stock: increment(-qtyToRevert),
                  updatedAt: serverTimestamp(),
                });

                const txRef = doc(collection(firestore, 'inventory_transactions'));
                await setDoc(txRef, {
                  businessId: business.id,
                  productId: item.productId,
                  productName: item.productName || 'Unknown',
                  type: 'out',
                  quantity: qtyToRevert,
                  date: serverTimestamp(),
                  notes: `Stock reversal for deleted PO #${deletingPurchase.poNumber || deletingPurchase.id.substring(0, 8)}`,
                  referenceId: deletingPurchase.id,
                  createdBy: currentUserProfile?.name || 'System'
                });
              } catch (e) {}
            }
          }
        }
      }

      // 7. Optimistic local state update
      setPurchases(prev => prev.filter(p => p.id !== deletingPurchase.id && (deletingPurchase.poNumber ? p.poNumber !== deletingPurchase.poNumber : true)));

      // 8. Log audit event
      await logAuditEvent(firestore, business.id, currentUserProfile, {
        action: 'purchase.delete',
        entity: { type: 'SupplierPurchase', id: deletingPurchase.id, name: deletingPurchase.poNumber || 'Purchase Order' },
        details: {
          poNumber: deletingPurchase.poNumber,
          totalAmount: deletingPurchase.totalAmount,
          supplierName: deletingPurchase.supplierName,
          status: deletingPurchase.status,
          itemsCount: deletingPurchase.items?.length || 0,
        }
      }).catch(() => {});

      toast({
        title: 'Purchase Order Deleted',
        description: `Order ${deletingPurchase.poNumber || ''} and related financial records removed successfully.`,
        variant: 'success'
      });
      setDeletingPurchase(null);
    } catch (err: any) {
      console.error('Failed to delete purchase order:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Delete',
        description: err?.message || 'Could not delete purchase order.'
      });
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
    if (isReadOnlyStore) {
      toast({
        title: 'Trial Expired (Read-Only Mode)',
        description: 'Your 30-day trial or plan has expired. Adding suppliers is disabled in read-only mode.',
        variant: 'destructive',
      });
      return;
    }

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
      ['Date', 'Title', 'Category', 'Funding Source', 'Amount', 'Payment Method', 'Paid From Till', 'Recipient', 'Logged By', 'Notes']
    ];
    filteredExpenses.forEach(e => {
      rows.push([
        safeToDate(e.date)?.toISOString().split('T')[0] || '',
        e.title,
        e.category,
        e.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
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
      ['PO Number', 'Date', 'Supplier', 'Funding Source', 'Items Count', 'Total Amount', 'Amount Paid', 'Balance Due', 'Order Status', 'Payment Status', 'Notes']
    ];
    filteredPurchases.forEach(p => {
      rows.push([
        p.poNumber,
        safeToDate(p.orderDate)?.toISOString().split('T')[0] || '',
        p.supplierName,
        p.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
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

  // Modal Data Export (PDF & CSV)
  const getModalExportData = React.useCallback(() => {
    if (!selectedKpiModal) return { title: '', columns: [] as string[], rows: [] as (string | number)[][], count: 0, totalAmount: 0 };
    const q = kpiModalSearch.toLowerCase().trim();
    const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (selectedKpiModal.id === 'total_outflow') {
      const combinedList: {
        id: string;
        date: Date | null;
        type: 'Expense' | 'Procurement';
        title: string;
        details: string;
        fundingSource: string;
        amount: number;
      }[] = [];

      expenses.forEach(e => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
        combinedList.push({
          id: `exp-${e.id}`,
          date: safeToDate(e.date),
          type: 'Expense',
          title: e.title || e.description,
          details: `Category: ${cat}`,
          fundingSource: e.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
          amount: Number(e.amount) || 0,
        });
      });

      purchases.forEach(p => {
        combinedList.push({
          id: `pur-${p.id}`,
          date: safeToDate(p.orderDate),
          type: 'Procurement',
          title: `Stock Procurement (${p.poNumber})`,
          details: `Supplier: ${p.supplierName} (${p.items?.length || 0} items)`,
          fundingSource: p.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
          amount: Number(p.totalAmount) || 0,
        });
      });

      combinedList.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

      const filtered = combinedList.filter(item =>
        !q || item.title.toLowerCase().includes(q) || item.details.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
      );

      const columns = ['Type', 'Date', 'Description', 'Funding Source', 'Details', 'Amount'];
      const rows = filtered.map(item => [
        item.type,
        item.date ? format(item.date, 'yyyy-MM-dd') : 'N/A',
        item.title,
        item.fundingSource,
        item.details,
        item.amount,
      ]);

      return {
        title: selectedKpiModal.title,
        columns,
        rows,
        count: filtered.length,
        totalAmount: filtered.reduce((sum, item) => sum + item.amount, 0),
      };
    }

    if (selectedKpiModal.id === 'operating_overheads' || selectedKpiModal.id === 'month_expenses' || selectedKpiModal.id === 'drawer_outflow') {
      const isPurchase = (e: any) =>
        e.category === 'supplier_payment' ||
        e.category === 'procurement' ||
        e.category === 'inventory_procurement';
      let expList = expenses.filter(e => !isPurchase(e));
      if (selectedKpiModal.id === 'month_expenses') {
        expList = expList.filter(e => (safeToDate(e.date) || new Date(0)) >= startOfThisMonth);
      } else if (selectedKpiModal.id === 'drawer_outflow') {
        expList = expList.filter(e => e.deductFromCashDrawer);
      }

      const filtered = expList.filter(e =>
        !q || (e.title || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q) || (e.recipient || '').toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );

      const columns = ['Date', 'Expense Title', 'Category', 'Funding Source', 'Payment Method', 'Recipient', 'Amount'];
      const rows = filtered.map(e => {
        const d = safeToDate(e.date);
        const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
        const methodStr = e.paymentMethod.replace('_', ' ');
        return [
          d ? format(d, 'yyyy-MM-dd') : 'N/A',
          e.title || e.description,
          cat,
          e.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
          `${methodStr}${e.deductFromCashDrawer ? ' (Drawer)' : ''}`,
          e.recipient || '-',
          Number(e.amount) || 0,
        ];
      });

      return {
        title: selectedKpiModal.title,
        columns,
        rows,
        count: filtered.length,
        totalAmount: filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      };
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

      const columns = ['PO Number', 'Order Date', 'Supplier', 'Status', 'Funding Source', 'Total Bill', 'Amount Paid', 'Balance Due'];
      const rows = filtered.map(p => {
        const d = safeToDate(p.orderDate);
        return [
          p.poNumber,
          d ? format(d, 'yyyy-MM-dd') : 'N/A',
          p.supplierName,
          p.status,
          p.deductionSource === 'net_profit' ? 'Net Profit' : 'Revenue',
          Number(p.totalAmount) || 0,
          Number(p.amountPaid || 0),
          Number(p.balanceDue || 0),
        ];
      });

      return {
        title: selectedKpiModal.title,
        columns,
        rows,
        count: filtered.length,
        totalAmount: filtered.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0),
      };
    }

    if (selectedKpiModal.id === 'suppliers') {
      const filtered = suppliers.filter(s =>
        !q || s.name.toLowerCase().includes(q) || (s.contactPerson || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q)
      );

      const columns = ['Supplier Name', 'Contact Person', 'Phone / Email', 'Payment Terms', 'Total Purchased', 'Debt Owed'];
      const rows = filtered.map(s => [
        s.name,
        s.contactPerson || '-',
        s.phone || s.email || '-',
        s.paymentTerms || 'Immediate',
        Number(s.totalPurchased || 0),
        Number(s.totalDebt || 0),
      ]);

      return {
        title: selectedKpiModal.title,
        columns,
        rows,
        count: filtered.length,
        totalAmount: filtered.reduce((sum, s) => sum + (Number(s.totalPurchased) || 0), 0),
      };
    }

    return { title: '', columns: [] as string[], rows: [] as (string | number)[][], count: 0, totalAmount: 0 };
  }, [selectedKpiModal, kpiModalSearch, expenses, purchases, suppliers]);

  const handleExportModalCSV = () => {
    const data = getModalExportData();
    if (!data || data.rows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no records matching the current view to export.',
      });
      return;
    }

    const csvRows: (string | number)[][] = [
      data.columns,
      ...data.rows,
    ];

    const slug = (selectedKpiModal?.id || 'breakdown').replace(/_/g, '-');
    downloadCsv(`zeneva-${slug}-${format(new Date(), 'yyyy-MM-dd')}.csv`, csvRows);
    toast({
      variant: 'success',
      title: 'Export Successful',
      description: `Exported ${data.rows.length} record(s) to CSV.`,
    });
  };

  const handleExportModalPDF = () => {
    const data = getModalExportData();
    if (!data || data.rows.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no records matching the current view to export.',
      });
      return;
    }

    toast({
      title: 'Generating PDF',
      description: 'Your breakdown report is being generated...',
    });

    const isWide = data.columns.length > 5;
    const doc = new jsPDF({
      orientation: isWide ? 'landscape' : 'portrait',
    });

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(16);
    doc.text(business?.name || "Zeneva POS", 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(data.title || "Breakdown Report", 14, 25);

    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated: ${format(new Date(), 'EEEE, MMMM d, yyyy')}`, 14, 31);
    if (kpiModalSearch.trim()) {
      doc.text(`Search Query: "${kpiModalSearch.trim()}"`, 14, 36);
    }

    const formattedRows = data.rows.map(row =>
      row.map(cell => {
        if (typeof cell === 'number') {
          return `${currencySymbol}${cell.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return String(cell ?? '');
      })
    );

    autoTable(doc, {
      head: [data.columns],
      body: formattedRows,
      startY: kpiModalSearch.trim() ? 40 : 36,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    const slug = (selectedKpiModal?.id || 'breakdown').replace(/_/g, '-');
    doc.save(`zeneva-${slug}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      variant: 'success',
      title: 'Export Successful',
      description: `Exported ${data.rows.length} record(s) to PDF.`,
    });
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
          {activeTab === 'suppliers' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              onClick={() => {
                if (isReadOnlyStore) return;
                setIsAddSupplierOpen(true);
              }}
              className="group hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircle className="h-4 w-4 me-2 text-orange-500 dark:text-orange-400 group-hover:text-white transition-colors" />
              Add Supplier
            </Button>
          )}

          <Button
            onClick={() => {
              if (isReadOnlyStore) return;
              resetExpenseForm();
              setIsAddExpenseOpen(true);
            }}
            disabled={isReadOnlyStore}
            title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
            variant="outline"
            className="shadow-xs group hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusCircle className="h-4 w-4 me-2 text-orange-500 dark:text-orange-400 group-hover:text-white transition-colors" />
            Record Expense
          </Button>

          {canViewPurchasesAndSuppliers && (
            <Button
              onClick={() => {
                if (isReadOnlyStore) return;
                resetOrderForm();
                setIsAddOrderOpen(true);
              }}
              disabled={isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              className="shadow-sm group bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Truck className="h-4 w-4 me-2 text-white group-hover:text-white transition-colors" />
              New Purchase Order
            </Button>
          )}
        </div>
      </div>

      {/* ======================== UNIFIED TABS AT TOP ======================== */}
      <Tabs value={activeTab} onValueChange={(v: any) => handleTabChange(v)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          <TabsList className={`grid w-full ${canViewPurchasesAndSuppliers ? 'sm:w-[680px] grid-cols-4' : 'sm:w-[340px] grid-cols-2'} h-auto p-1 bg-muted/60 rounded-xl`}>
            <TabsTrigger value="dashboard" className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">
              <LayoutDashboard className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">
              <Wallet className="h-4 w-4 text-orange-500 dark:text-orange-400" />
              <span>Expenses</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-mono">
                {expenses.length}
              </Badge>
            </TabsTrigger>
            {canViewPurchasesAndSuppliers && (
              <>
                <TabsTrigger value="purchases" className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">
                  <Truck className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  <span>Purchases</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-mono">
                    {purchases.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="suppliers" className="flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">
                  <Building2 className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                  <span>Suppliers</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-mono">
                    {suppliers.length}
                  </Badge>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
              Overheads: <strong className="text-foreground">{currencySymbol}{metrics.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
              Procurement: <strong className="text-foreground">{currencySymbol}{metrics.totalProcurement.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            </span>
          </div>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: EXECUTIVE DASHBOARD / OVERVIEW */}
        {/* ============================================================= */}
        <TabsContent value="dashboard" className="space-y-6 pt-1">
          {/* COMBINED OUTFLOW KPI CARDS */}
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Total Cash Outflow
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {currencySymbol}{metrics.combinedOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Operating ({currencySymbol}{metrics.totalOperatingExpenses.toLocaleString()}) + Restock ({currencySymbol}{metrics.totalPurchasesPaid.toLocaleString()})
            </p>
            {metrics.totalProfitReinvested > 0 && (
              <div className="flex items-center gap-1.5 pt-1 border-t text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                <Sparkles className="h-3 w-3 shrink-0" />
                <span>Reinvested from Profit: {currencySymbol}{metrics.totalProfitReinvested.toLocaleString()}</span>
              </div>
            )}
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Operating Overheads
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Expenses This Month
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Drawer / Till Outflow
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Stock Procurement
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Paid to Suppliers
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Accounts Payable (Debt)
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
          className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">
              Active Suppliers
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

          {/* ======================== DASHBOARD RECENT ACTIVITY ======================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Operating Expenses */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-orange-500" />
                    Recent Expenses
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest operational bills & overhead payments
                  </CardDescription>
                </div>
                <button 
                  type="button"
                  onClick={() => handleTabChange('expenses')}
                  className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline bg-transparent p-0 cursor-pointer transition-colors"
                >
                  <span>View All ({expenses.length})</span>
                  <ArrowDownRight className="h-3.5 w-3.5 ml-1 -rotate-90" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenses.slice(0, 5).map((exp) => {
                  const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                  const CatIcon = catInfo?.icon || Tag;
                  const dateObj = safeToDate(exp.date);
                  return (
                    <div 
                      key={exp.id} 
                      onClick={() => setSelectedExpenseDetail(exp)}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 border border-orange-500/20">
                          <CatIcon className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{exp.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {dateObj ? format(dateObj, 'MMM d, yyyy') : 'Recent'} {exp.recipient ? `• ${exp.recipient}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-foreground shrink-0 ml-2">
                        {currencySymbol}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
                {expenses.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No operating expenses recorded yet.
                  </div>
                )}
                <Button 
                  onClick={() => {
                    if (isReadOnlyStore) return;
                    resetExpenseForm();
                    setIsAddExpenseOpen(true);
                  }}
                  disabled={isReadOnlyStore}
                  title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs mt-2 group hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5 text-orange-500 dark:text-orange-400 group-hover:text-white transition-colors" />
                  Record New Expense
                </Button>
              </CardContent>
            </Card>

            {/* Recent Purchase Orders */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-500" />
                    Recent Stock Purchases
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest wholesale procurement orders
                  </CardDescription>
                </div>
                <button 
                  type="button"
                  onClick={() => handleTabChange('purchases')}
                  className="inline-flex items-center text-xs text-orange-600 dark:text-orange-400 font-medium hover:underline bg-transparent p-0 cursor-pointer transition-colors"
                >
                  <span>View All ({purchases.length})</span>
                  <ArrowDownRight className="h-3.5 w-3.5 ml-1 -rotate-90" />
                </button>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchases.slice(0, 5).map((po) => {
                  const dateObj = safeToDate(po.orderDate);
                  return (
                    <div key={po.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 border border-orange-500/20">
                          <Truck className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">{po.supplierName || 'Supplier'}</span>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-normal", 
                              po.status === 'received' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300' :
                              po.status === 'cancelled' ? 'bg-rose-500/10 text-rose-600 border-rose-300' :
                              'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                            )}>
                              {po.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            PO: {po.poNumber} • {dateObj ? format(dateObj, 'MMM d, yyyy') : 'Recent'} • {po.items?.length || 0} items
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-mono font-bold text-xs text-foreground block">
                          {currencySymbol}{po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {po.balanceDue > 0 && (
                          <span className="text-[10px] text-rose-500 font-mono">
                            Due: {currencySymbol}{po.balanceDue.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {purchases.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No purchase orders recorded yet.
                  </div>
                )}
                {canViewPurchasesAndSuppliers && (
                  <Button 
                    onClick={() => {
                      if (isReadOnlyStore) return;
                      resetOrderForm();
                      setIsAddOrderOpen(true);
                    }}
                    disabled={isReadOnlyStore}
                    title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs mt-2 group hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Truck className="h-3.5 w-3.5 mr-1.5 text-orange-500 dark:text-orange-400 group-hover:text-white transition-colors" />
                    New Purchase Order
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================= */}
        {/* TAB 2: OPERATING EXPENSES */}
        {/* ============================================================= */}
        <TabsContent value="expenses" className="space-y-4 pt-1">
          {/* FOCUSED EXPENSES KPI STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              onClick={() => {
                setKpiModalSearch('');
                setSelectedKpiModal({
                  id: 'operating_overheads',
                  title: 'Operating Overheads Breakdown',
                  description: 'All-time shop operational costs categorized by utility, rent, staff, packaging, etc.',
                });
              }}
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Operating Overheads
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Expenses This Month
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Drawer / Till Outflow
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
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

            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
                  <span>Profit Reinvestment</span>
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {currencySymbol}{metrics.totalProfitReinvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Funded from retained earnings
                </p>
              </CardContent>
            </Card>
          </div>
          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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

                <Select value={expenseSourceFilter} onValueChange={setExpenseSourceFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2 truncate">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Funding Source" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funding Sources</SelectItem>
                    <SelectItem value="revenue">Operational Revenue</SelectItem>
                    <SelectItem value="net_profit">Net Profit Reinvestment</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="h-4 w-4 text-orange-500 shrink-0" />
                      <SelectValue placeholder="Time Period" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Date Range...</SelectItem>
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
                <div className="flex items-center sm:col-span-2 md:col-span-5 justify-end">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={handleExportExpenseReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>

              {timeRange === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t mt-3 bg-muted/20 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">From:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs w-full sm:w-[150px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">To:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs w-full sm:w-[150px]"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Dates
                    </Button>
                  )}
                </div>
              )}
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
                  <Button
                    onClick={() => {
                      if (isReadOnlyStore) return;
                      resetExpenseForm();
                      setIsAddExpenseOpen(true);
                    }}
                    disabled={isReadOnlyStore}
                    title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                    size="sm"
                    className="group bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PlusCircle className="h-4 w-4 me-2 text-white group-hover:text-white" />
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
                      <TableHead>Funding Source</TableHead>
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
                        <TableRow 
                          key={exp.id} 
                          className="hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => setSelectedExpenseDetail(exp)}
                        >
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
                            {exp.deductionSource === 'net_profit' ? (
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 w-fit font-medium">
                                <Sparkles className="h-3 w-3" />
                                <span>Net Profit</span>
                              </Badge>
                            ) : exp.deductionSource === 'excluded' ? (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 flex items-center gap-1 w-fit font-medium">
                                <span>Excluded</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 w-fit">
                                <span>Operational</span>
                              </Badge>
                            )}
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedExpenseDetail(exp)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Details & Voucher
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadExpenseVoucherPDF(exp)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Voucher (PDF)
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={isReadOnlyStore} onClick={() => {
                                  setEditingExpense(exp);
                                  setExpenseTitle(exp.title);
                                  setExpenseAmount(exp.amount.toString());
                                  setExpenseCategory(exp.category);
                                  setExpenseMethod(exp.paymentMethod);
                                  setExpenseDeductionSource(exp.deductionSource || 'revenue');
                                  setExpenseDate(safeToDate(exp.date)?.toISOString().split('T')[0] || '');
                                  setExpenseRecipient(exp.recipient || '');
                                  setExpenseNotes(exp.notes || '');
                                  setExpenseDeductDrawer(!!exp.deductFromCashDrawer);
                                  setIsEditExpenseOpen(true);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Expense
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={isReadOnlyStore} onClick={() => setDeletingExpense(exp)} className="text-destructive focus:text-destructive">
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
        {/* TAB 3: STOCK PURCHASES & PROCUREMENT */}
        {/* ============================================================= */}
        <TabsContent value="purchases" className="space-y-4 pt-1">
          {/* FOCUSED PURCHASES KPI STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              onClick={() => {
                setKpiModalSearch('');
                setSelectedKpiModal({
                  id: 'stock_procurement',
                  title: 'Stock Procurement Bills',
                  description: 'Purchase orders issued to distributors and wholesalers for inventory restock.',
                });
              }}
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Total Procurement
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Paid to Suppliers
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Accounts Payable (Debt)
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Active Suppliers
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
          {/* Purchase Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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

                <Select value={purchaseSourceFilter} onValueChange={setPurchaseSourceFilter}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2 truncate">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Funding Source" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funding Sources</SelectItem>
                    <SelectItem value="revenue">Operational Revenue</SelectItem>
                    <SelectItem value="net_profit">Net Profit Reinvestment</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={purchaseTimeRange} onValueChange={(v: any) => setPurchaseTimeRange(v)}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="h-4 w-4 text-orange-500 shrink-0" />
                      <SelectValue placeholder="Order Period" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Date Range...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {purchaseTimeRange === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t mt-3 bg-muted/20 p-2.5 rounded-lg">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">From:</span>
                    <Input
                      type="date"
                      value={purchaseCustomStartDate}
                      onChange={(e) => setPurchaseCustomStartDate(e.target.value)}
                      className="h-8 text-xs w-full sm:w-[150px]"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">To:</span>
                    <Input
                      type="date"
                      value={purchaseCustomEndDate}
                      onChange={(e) => setPurchaseCustomEndDate(e.target.value)}
                      className="h-8 text-xs w-full sm:w-[150px]"
                    />
                  </div>
                  {(purchaseCustomStartDate || purchaseCustomEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPurchaseCustomStartDate(''); setPurchaseCustomEndDate(''); }}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Dates
                    </Button>
                  )}
                </div>
              )}
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
                  <Button 
                    onClick={() => { resetOrderForm(); setIsAddOrderOpen(true); }} 
                    disabled={isReadOnlyStore}
                    title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                    size="sm" 
                    className="group bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Truck className="h-4 w-4 me-2 text-white group-hover:text-white" />
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
                      <TableHead>Funding Source</TableHead>
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
                          <TableCell>
                            {purchase.deductionSource === 'net_profit' ? (
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 w-fit font-medium">
                                <Sparkles className="h-3 w-3" />
                                <span>Net Profit</span>
                              </Badge>
                            ) : purchase.deductionSource === 'excluded' ? (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 flex items-center gap-1 w-fit font-medium">
                                <span>Excluded</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 w-fit">
                                <span>Operational</span>
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
                                  <DropdownMenuItem disabled={isReadOnlyStore} title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined} onClick={() => setReceivingPurchase(purchase)} className="text-emerald-600 focus:text-emerald-600">
                                    <Boxes className="h-4 w-4 mr-2" />
                                    Mark as Received & Restock
                                  </DropdownMenuItem>
                                )}

                                {purchase.balanceDue > 0 && (
                                  <DropdownMenuItem disabled={isReadOnlyStore} title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined} onClick={() => {
                                    setPayingPurchase(purchase);
                                    setPayAmount(purchase.balanceDue.toString());
                                    setPayDeductionSource(purchase.deductionSource || 'revenue');
                                  }}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem disabled={isReadOnlyStore} title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined} onClick={() => setDeletingPurchase(purchase)} className="text-destructive focus:text-destructive">
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
        {/* TAB 4: SUPPLIERS DIRECTORY */}
        {/* ============================================================= */}
        <TabsContent value="suppliers" className="space-y-4 pt-1">
          {/* FOCUSED SUPPLIERS KPI STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">Active Suppliers</CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">{suppliers.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Registered wholesalers and distributors</p>
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
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Total Supplier Debt
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {currencySymbol}{metrics.totalSupplierDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Unsettled purchase orders owed to suppliers
                </p>
              </CardContent>
            </Card>

            <Card 
              onClick={() => {
                setKpiModalSearch('');
                setSelectedKpiModal({
                  id: 'stock_procurement',
                  title: 'Stock Procurement Bills',
                  description: 'Purchase orders issued to distributors and wholesalers for inventory restock.',
                });
              }}
              className="shadow-xs cursor-pointer hover:ring-2 hover:ring-primary/20 hover:ring-offset-2 transition-all"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-medium">
                  Total Procured from Suppliers
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {currencySymbol}{metrics.totalProcurement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Historical wholesale purchase orders
                </p>
              </CardContent>
            </Card>
          </div>
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
            <Button 
              onClick={() => setIsAddSupplierOpen(true)} 
              disabled={isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              className="group bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusCircle className="h-4 w-4 me-2 text-white group-hover:text-white transition-colors" />
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
                <Button 
                  onClick={() => setIsAddSupplierOpen(true)} 
                  disabled={isReadOnlyStore}
                  title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                  size="sm" 
                  className="group bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="h-4 w-4 me-2 text-white group-hover:text-white transition-colors" />
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

                {/* Funding / Deduction Source */}
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-primary" />
                      Funding & Deduction Source
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Accounting treatment</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div
                      onClick={() => setExpenseDeductionSource('revenue')}
                      className={cn(
                        "cursor-pointer p-2.5 rounded-lg border text-left transition-all",
                        expenseDeductionSource === 'revenue'
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                          : "bg-muted/20 border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-3.5 w-3.5 rounded-full border flex items-center justify-center", expenseDeductionSource === 'revenue' ? "border-primary bg-primary" : "border-muted-foreground")}>
                          {expenseDeductionSource === 'revenue' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-semibold text-foreground">Operational Overhead</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 pl-5 leading-relaxed">
                        Deducted from operating profit as standard overhead. Never reduces sales revenue.
                      </p>
                    </div>

                    <div
                      onClick={() => setExpenseDeductionSource('net_profit')}
                      className={cn(
                        "cursor-pointer p-2.5 rounded-lg border text-left transition-all",
                        expenseDeductionSource === 'net_profit'
                          ? "bg-purple-500/10 border-purple-500 shadow-xs ring-1 ring-purple-500/30 dark:bg-purple-950/30"
                          : "bg-muted/20 border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-3.5 w-3.5 rounded-full border flex items-center justify-center", expenseDeductionSource === 'net_profit' ? "border-purple-600 bg-purple-600" : "border-muted-foreground")}>
                          {expenseDeductionSource === 'net_profit' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Net Profit Reinvest
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 pl-5 leading-relaxed">
                        Reinvested from retained earnings without reducing operational gross margin.
                      </p>
                    </div>

                    <div
                      onClick={() => setExpenseDeductionSource('excluded')}
                      className={cn(
                        "cursor-pointer p-2.5 rounded-lg border text-left transition-all",
                        expenseDeductionSource === 'excluded'
                          ? "bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30 dark:bg-emerald-950/30"
                          : "bg-muted/20 border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-3.5 w-3.5 rounded-full border flex items-center justify-center", expenseDeductionSource === 'excluded' ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground")}>
                          {expenseDeductionSource === 'excluded' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Do Not Deduct
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 pl-5 leading-relaxed">
                        Excluded from profit & loss. Does not deduct from net profit or sales revenue.
                      </p>
                    </div>
                  </div>
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
              <Button
                type="submit"
                disabled={submitting || isReadOnlyStore}
                title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                className="h-10 px-5 text-xs font-semibold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
                  <Button type="button" variant="outline" size="sm" onClick={handleAddOrderItem} className="group hover:bg-primary hover:text-white transition-colors">
                    <PlusCircle className="h-3.5 w-3.5 mr-1 text-orange-500 dark:text-orange-400 group-hover:text-white transition-colors" />
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

              {/* Deduction / Funding Source Selection */}
              <div className="space-y-1.5 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Coins className="h-3.5 w-3.5 text-primary" />
                    Funding & Deduction Source
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Accounting source</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div
                    onClick={() => setOrderDeductionSource('revenue')}
                    className={cn(
                      "cursor-pointer p-2.5 rounded-md border text-left transition-all",
                      orderDeductionSource === 'revenue'
                        ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                        : "bg-background border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-3 w-3 rounded-full border flex items-center justify-center", orderDeductionSource === 'revenue' ? "border-primary bg-primary" : "border-muted-foreground")}>
                        {orderDeductionSource === 'revenue' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-medium text-foreground">Operational (COGS)</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 pl-4.5 leading-relaxed">
                      Paid from operating cash flow. Never reduces sales revenue.
                    </p>
                  </div>

                  <div
                    onClick={() => setOrderDeductionSource('net_profit')}
                    className={cn(
                      "cursor-pointer p-2.5 rounded-md border text-left transition-all",
                      orderDeductionSource === 'net_profit'
                        ? "bg-purple-500/10 border-purple-500 shadow-xs ring-1 ring-purple-500/30 dark:bg-purple-950/30"
                        : "bg-background border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-3 w-3 rounded-full border flex items-center justify-center", orderDeductionSource === 'net_profit' ? "border-purple-600 bg-purple-600" : "border-muted-foreground")}>
                        {orderDeductionSource === 'net_profit' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Net Profit Reinvest
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 pl-4.5 leading-relaxed">
                      Reinvested from retained earnings without reducing sales revenue.
                    </p>
                  </div>

                  <div
                    onClick={() => setOrderDeductionSource('excluded')}
                    className={cn(
                      "cursor-pointer p-2.5 rounded-md border text-left transition-all",
                      orderDeductionSource === 'excluded'
                        ? "bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30 dark:bg-emerald-950/30"
                        : "bg-background border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-3 w-3 rounded-full border flex items-center justify-center", orderDeductionSource === 'excluded' ? "border-emerald-600 bg-emerald-600" : "border-muted-foreground")}>
                        {orderDeductionSource === 'excluded' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Do Not Deduct
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 pl-4.5 leading-relaxed">
                      Asset stock. Not deducted from net profit or sales revenue.
                    </p>
                  </div>
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
              <Button
                type="submit"
                disabled={submitting || isReadOnlyStore}
                title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
              <Button
                type="submit"
                disabled={submitting || isReadOnlyStore}
                title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="capitalize">
                    {viewingPurchase.status}
                  </Badge>
                  {viewingPurchase.deductionSource === 'net_profit' ? (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 text-xs flex items-center gap-1 font-medium">
                      <Sparkles className="h-3 w-3" />
                      <span>Net Profit</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 text-xs">
                      <span>Revenue</span>
                    </Badge>
                  )}
                </div>
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

              <div className="space-y-1">
                <Label htmlFor="pay-source">Deduction / Funding Source</Label>
                <Select value={payDeductionSource} onValueChange={(v: any) => setPayDeductionSource(v)}>
                  <SelectTrigger id="pay-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Operational Overhead / COGS</SelectItem>
                    <SelectItem value="net_profit">Net Profit Reinvestment</SelectItem>
                    <SelectItem value="excluded">Do Not Deduct (Asset Stock / Excluded)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Choose whether this payment is deducted from operational revenue or reinvested from net profit.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPayingPurchase(null)}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleRecordOrderPayment(payingPurchase)} 
                disabled={submitting || isReadOnlyStore}
                title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
              >
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
              disabled={submitting || isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
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
            <AlertDialogAction 
              onClick={handleDeleteExpense} 
              disabled={submitting || isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              className="bg-destructive hover:bg-destructive/90 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== ALERT: DELETE PURCHASE ORDER ======================== */}
      <AlertDialog open={!!deletingPurchase} onOpenChange={(open) => { if (!open && !submitting) setDeletingPurchase(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Are you sure you want to delete purchase order <span className="font-bold">{deletingPurchase?.poNumber}</span> from <span className="font-bold">{deletingPurchase?.supplierName}</span>?
              </span>
              {deletingPurchase?.status === 'received' && (
                <span className="block text-rose-600 dark:text-rose-400 font-medium">
                  ⚠️ Note: This order was marked as received. Deleting it will reverse the restocked quantities from your inventory.
                </span>
              )}
              <span className="block text-xs text-muted-foreground">
                Associated payments will be removed from your expenses and net profit calculations. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePurchaseOrder}
              disabled={submitting || isReadOnlyStore}
              title={isReadOnlyStore ? 'Plan expired (Read-only mode)' : undefined}
              className="bg-destructive hover:bg-destructive/90 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== DRILL-DOWN KPI MODAL ======================== */}
      {selectedKpiModal && (
        <Dialog open={!!selectedKpiModal} onOpenChange={(open) => { if (!open) setSelectedKpiModal(null); }}>
          <DialogContent className="max-w-6xl w-[96vw] max-h-[88vh] flex flex-col">
            <DialogHeader className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Wallet className="h-5 w-5 text-primary" />
                {selectedKpiModal.title}
              </DialogTitle>
              <DialogDescription>
                {selectedKpiModal.description}
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center gap-2 px-1 pt-1 pb-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search breakdown records..."
                    className="pl-9 h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 shadow-xs"
                    value={kpiModalSearch}
                    onChange={(e) => setKpiModalSearch(e.target.value)}
                  />
                </div>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium shrink-0">
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportModalPDF}>
                      <Printer className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportModalCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV / Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md">
                {(() => {
                  const q = kpiModalSearch.toLowerCase().trim();
                  const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

                  if (selectedKpiModal.id === 'total_outflow') {
                    // Unified timeline of expenses + purchases
                    const combinedList: { id: string; date: Date | null; type: 'expense' | 'purchase'; title: string; subtitle: string; amount: number; badge: string; deductionSource: ExpenseDeductionSource; raw: any }[] = [];
                    
                    expenses.forEach(e => {
                      combinedList.push({
                        id: `exp-${e.id}`,
                        date: safeToDate(e.date),
                        type: 'expense',
                        title: e.title,
                        subtitle: `Category: ${EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category}`,
                        amount: Number(e.amount) || 0,
                        badge: e.paymentMethod.replace('_', ' '),
                        deductionSource: e.deductionSource || 'revenue',
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
                        deductionSource: p.deductionSource || 'revenue',
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
                            <TableHead className="text-xs whitespace-nowrap">Type</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                            <TableHead className="text-xs min-w-[160px]">Description</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Funding Source</TableHead>
                            <TableHead className="text-xs min-w-[200px]">Details</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="whitespace-nowrap">
                                <Badge variant="outline" className={item.type === 'expense' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}>
                                  {item.type === 'expense' ? 'Expense' : 'Procurement'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                {item.date ? format(item.date, 'MMM d, yyyy') : 'N/A'}
                              </TableCell>
                              <TableCell className="font-medium text-xs">{item.title}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {item.deductionSource === 'net_profit' ? (
                                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 w-fit font-medium">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    <span>Net Profit</span>
                                  </Badge>
                                ) : item.deductionSource === 'excluded' ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 flex items-center gap-1 w-fit font-medium">
                                    <span>Excluded</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 w-fit">
                                    <span>Operational</span>
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.subtitle}</TableCell>
                              <TableCell className="text-xs text-right font-bold font-mono whitespace-nowrap">
                                {currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    );
                  }

                  if (selectedKpiModal.id === 'operating_overheads' || selectedKpiModal.id === 'month_expenses' || selectedKpiModal.id === 'drawer_outflow') {
                    const isPurchase = (e: any) =>
                      e.category === 'supplier_payment' ||
                      e.category === 'procurement' ||
                      e.category === 'inventory_procurement';
                    let expList = expenses.filter(e => !isPurchase(e));
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
                            <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                            <TableHead className="text-xs min-w-[160px]">Expense Title</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Category</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Funding Source</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Payment Method</TableHead>
                            <TableHead className="text-xs min-w-[120px]">Recipient</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(e => {
                            const catLabel = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label.split('(')[0].trim() || e.category;
                            const d = safeToDate(e.date);
                            return (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {d ? format(d, 'MMM d, yyyy') : 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-xs">{e.title || e.description}</TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
                                  <Badge variant="secondary" className="font-normal text-[11px]">{catLabel}</Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {e.deductionSource === 'net_profit' ? (
                                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 w-fit font-medium">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      <span>Net Profit</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 w-fit">
                                      <span>Revenue</span>
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs capitalize whitespace-nowrap">
                                  {e.paymentMethod.replace('_', ' ')}
                                  {e.deductFromCashDrawer && <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Drawer</Badge>}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.recipient || '-'}</TableCell>
                                <TableCell className="text-xs text-right font-bold font-mono text-foreground whitespace-nowrap">
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
                            <TableHead className="text-xs whitespace-nowrap">PO Number</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Order Date</TableHead>
                            <TableHead className="text-xs min-w-[160px]">Supplier</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Funding Source</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Total Bill</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Amount Paid</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Balance Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(p => {
                            const d = safeToDate(p.orderDate);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">{p.poNumber}</TableCell>
                                <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {d ? format(d, 'MMM d, yyyy') : 'N/A'}
                                </TableCell>
                                <TableCell className="font-medium text-xs">{p.supplierName}</TableCell>
                                <TableCell className="text-xs whitespace-nowrap">
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
                                <TableCell className="whitespace-nowrap">
                                  {p.deductionSource === 'net_profit' ? (
                                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 w-fit font-medium">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      <span>Net Profit</span>
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 w-fit">
                                      <span>Revenue</span>
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono font-medium whitespace-nowrap">
                                  {currencySymbol}{Number(p.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {currencySymbol}{Number(p.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
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
                            <TableHead className="text-xs min-w-[160px]">Supplier Name</TableHead>
                            <TableHead className="text-xs min-w-[140px]">Contact Person</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Phone / Email</TableHead>
                            <TableHead className="text-xs whitespace-nowrap">Payment Terms</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Total Purchased</TableHead>
                            <TableHead className="text-xs text-right whitespace-nowrap">Debt Owed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium text-xs">{s.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{s.contactPerson || '-'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{s.phone || s.email || '-'}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">{s.paymentTerms || 'Immediate'}</TableCell>
                              <TableCell className="text-xs text-right font-mono font-medium whitespace-nowrap">
                                {currencySymbol}{Number(s.totalPurchased || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-xs text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
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

            {(() => {
              const modalData = getModalExportData();
              return (
                <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {modalData.count} record{modalData.count === 1 ? '' : 's'}
                    {modalData.totalAmount > 0 && (
                      <span className="ml-2 font-medium text-foreground">
                        • Total: {currencySymbol}{modalData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                          <Download className="h-3.5 w-3.5" />
                          <span>Export</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExportModalPDF}>
                          <Printer className="h-4 w-4 mr-2" />
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportModalCSV}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Export as CSV / Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSelectedKpiModal(null)}>
                      Close
                    </Button>
                  </div>
                </DialogFooter>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* ======================== EXPENSE DETAIL & VOUCHER MODAL ======================== */}
      {selectedExpenseDetail && (
        <Dialog open={!!selectedExpenseDetail} onOpenChange={(open) => { if (!open) setSelectedExpenseDetail(null); }}>
          <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
            {/* Gradient Top Banner */}
            <div className="bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent p-6 border-b border-border/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[11px] bg-background/80 text-foreground border-border px-2 py-0.5">
                    #{selectedExpenseDetail.id ? selectedExpenseDetail.id.slice(-8).toUpperCase() : 'EXPENSE'}
                  </Badge>
                  {(() => {
                    const cat = EXPENSE_CATEGORIES.find(c => c.id === selectedExpenseDetail.category);
                    const CatIcon = cat?.icon || Tag;
                    return (
                      <Badge variant="outline" className={cn("text-xs font-normal flex items-center gap-1.5 px-2.5 py-0.5", cat?.color)}>
                        <CatIcon className="h-3 w-3" />
                        <span>{cat?.label.split('(')[0].trim() || selectedExpenseDetail.category}</span>
                      </Badge>
                    );
                  })()}
                  {selectedExpenseDetail.deductionSource === 'net_profit' ? (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 flex items-center gap-1 font-medium px-2 py-0.5">
                      <Sparkles className="h-3 w-3" />
                      <span>Net Profit Reinvestment</span>
                    </Badge>
                  ) : selectedExpenseDetail.deductionSource === 'excluded' ? (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300/40 flex items-center gap-1 font-medium px-2 py-0.5">
                      <span>Excluded from Profit</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300/40 flex items-center gap-1 px-2 py-0.5">
                      <span>Operational Overhead</span>
                    </Badge>
                  )}
                  {selectedExpenseDetail.deductFromCashDrawer && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300/50 px-2 py-0.5">
                      Till Drawer Outflow
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {selectedExpenseDetail.title || selectedExpenseDetail.description || 'Expense Voucher'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Disbursement recorded on {(() => {
                    const d = safeToDate(selectedExpenseDetail.date);
                    return d ? format(d, 'EEEE, MMMM d, yyyy • h:mm a') : 'N/A';
                  })()}
                </DialogDescription>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Amount Highlight Hero */}
              <div className="p-5 rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Disbursed Amount
                  </span>
                  <div className="text-3xl font-extrabold font-mono text-foreground tracking-tight mt-0.5">
                    {currencySymbol}{Number(selectedExpenseDetail.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-medium text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Settled / Disbursed
                  </Badge>
                </div>
              </div>

              {/* Particulars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Paid To / Recipient</span>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedExpenseDetail.recipient || '— (Internal / Shop Overhead)'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Payment Method</span>
                  <p className="font-semibold text-foreground text-sm capitalize">
                    {selectedExpenseDetail.paymentMethod.replace('_', ' ')}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Funding / Accounting Source</span>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedExpenseDetail.deductionSource === 'net_profit'
                      ? 'Net Profit Reinvestment'
                      : selectedExpenseDetail.deductionSource === 'excluded'
                      ? 'Excluded (Do Not Deduct from Profit or Revenue)'
                      : 'Operational Overhead'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Till / Register Cash Outflow</span>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedExpenseDetail.deductFromCashDrawer ? 'Yes (Cash deducted from register till)' : 'No (Direct bank/card payment)'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Recorded By</span>
                  <p className="font-semibold text-foreground text-sm">
                    {selectedExpenseDetail.createdByName || selectedExpenseDetail.paidBy || 'Administrator'}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                  <span className="text-muted-foreground font-medium block">Reference / Voucher ID</span>
                  <p className="font-mono text-muted-foreground text-xs truncate select-all">
                    {selectedExpenseDetail.id}
                  </p>
                </div>
              </div>

              {/* Notes & Remarks */}
              {(selectedExpenseDetail.notes || selectedExpenseDetail.description) && (
                <div className="p-4 rounded-xl border bg-muted/30 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Notes & Remarks
                  </span>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {selectedExpenseDetail.notes || selectedExpenseDetail.description}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <DialogFooter className="p-4 border-t bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Zeneva Verified Payment Voucher
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleDownloadExpenseVoucherPDF(selectedExpenseDetail)}
                  className="gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Voucher (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedExpenseDetail(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
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
