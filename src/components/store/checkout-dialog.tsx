'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch, addDoc, updateDoc, increment } from 'firebase/firestore';
import { Loader2, MessageSquare, MessageCircle, CreditCard, Building, Globe } from 'lucide-react';
import { isCoreFeatureBlocked } from '@/lib/plan';
import type { OnlineOrder } from '@/types';
import usePaystack from '@/hooks/use-paystack';
import { apiBase } from '@/lib/platform';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { useStore } from '@/context/store-context';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';

interface CheckoutDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export default function CheckoutDialog({ isOpen, onOpenChange }: CheckoutDialogProps) {
    const { cart, business, onOrderPlaced, subtotal } = useStore();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { initializePayment, isScriptLoaded } = usePaystack();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [address, setAddress] = React.useState('');
    const [selectedShipping, setSelectedShipping] = React.useState<string | undefined>(undefined);

    const currency = business?.settings?.currency || 'NGN';
    const currencySymbol =
        currency === 'USD' ? '$' :
        currency === 'YER' ? 'YER ' :
        currency === 'SAR' ? 'SAR ' :
        currency === 'AED' ? 'AED ' :
        currency === 'EUR' ? '€' :
        currency === 'GBP' ? '£' : '₦';

    // Auto-detect Arabic from business name or currency
    const defaultIsArabic =
        /[\u0600-\u06FF]/.test(business?.name || '') ||
        /[\u0600-\u06FF]/.test(business?.settings?.publicStore?.headline || '') ||
        currency === 'YER' ||
        currency === 'SAR' ||
        currency === 'AED';

    const [lang, setLang] = React.useState<'ar' | 'en'>(defaultIsArabic ? 'ar' : 'en');
    const isRtl = lang === 'ar';

    const t = {
        title: lang === 'ar' ? 'إتمام الطلب' : 'Complete Your Order',
        subtitle: lang === 'ar' ? 'أدخل بيانات الاتصال الخاصة بك للتوصيل وتأكيد الطلب.' : 'Enter your contact details for delivery and confirmation.',
        fullName: lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *',
        fullNamePlaceholder: lang === 'ar' ? 'مثال: أحمد علي' : 'e.g. Ahmed Ali',
        phone: lang === 'ar' ? 'رقم الهاتف / الواتساب *' : 'Phone Number / WhatsApp *',
        phonePlaceholder: lang === 'ar' ? 'مثال: 000 000 770 967+' : 'e.g. +967 770 000 000',
        email: lang === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email Address (Optional)',
        address: lang === 'ar' ? 'عنوان التوصيل *' : 'Delivery Address *',
        addressPlaceholder: lang === 'ar' ? 'المدينة، الشارع، المبنى، أقرب معلم...' : 'City, Street, Building, Landmark...',
        deliveryMethod: lang === 'ar' ? 'طريقة التوصيل' : 'Delivery Method',
        deliveryMethodPlaceholder: lang === 'ar' ? 'اختر خيار التوصيل...' : 'Select a delivery option...',
        subtotal: lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
        items: lang === 'ar' ? 'عناصر' : 'items',
        shipping: lang === 'ar' ? 'رسوم التوصيل' : 'Shipping',
        totalToPay: lang === 'ar' ? 'المبلغ الإجمالي' : 'Total to Pay',
        cancel: lang === 'ar' ? 'إلغاء' : 'Cancel',
        orderViaChat: lang === 'ar' ? 'إرسال الطلب عبر المحادثة' : 'Order via Live Store Chat',
        orderViaWhatsApp: lang === 'ar' ? 'طلب عبر واتساب' : 'Order via WhatsApp',
        payCard: lang === 'ar' ? 'الدفع بالبطاقة' : 'Pay with Card',
        confirmBank: lang === 'ar' ? 'تأكيد الطلب البنكي' : 'Confirm Bank Order',
        bankDetailsTitle: lang === 'ar' ? 'تفاصيل التحويل البنكي:' : 'Bank Transfer Details:',
        bankNotice: lang === 'ar' ? 'البنك' : 'Bank',
        accountNotice: lang === 'ar' ? 'رقم الحساب' : 'Account',
        chatNoticeTitle: lang === 'ar' ? 'تأكيد فوري عبر المحادثة المباشرة للمتجر' : 'Instant In-Store Chat Confirmation',
        chatNoticeDesc: lang === 'ar'
            ? 'سيتم إرسال طلبك مباشرة إلى فريق المتجر داخل التطبيق. لا يتطلب بطاقة بنكية أو واتساب!'
            : 'Your order will be instantly dispatched directly to the store team via live chat. No card or WhatsApp required!',
    };

    // Load customer info from localStorage if previously entered
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem('zeneva_store_customer_info');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.name && !name) setName(parsed.name);
                if (parsed.phone && !phone) setPhone(parsed.phone);
                if (parsed.email && !email) setEmail(parsed.email);
                if (parsed.address && !address) setAddress(parsed.address);
            } catch (_) { }
        }
    }, [isOpen]);

    const shippingOptions = business?.settings?.publicStore?.shippingOptions || [];
    const chosenShippingOption = shippingOptions.find(opt => opt.name === selectedShipping);
    const shippingCost = chosenShippingOption?.price || 0;

    const total = subtotal + shippingCost;

    const resetForm = () => {
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setSelectedShipping(undefined);
    };

    const hasBankDetails = Boolean(business?.settings?.paymentBankName && business.settings?.paymentBankAccountId);
    const hasPaystack = Boolean(business?.settings?.paystackSubaccount && business.settings.paystackSubaccount.length > 5);

    const createOrderInFirestore = React.useCallback(async (paymentDetails: {
        method: 'Paystack' | 'Bank Transfer' | 'WhatsApp' | 'In-Store Chat';
        reference?: string;
        status: 'paid' | 'pending';
    }) => {
        if (!firestore || !business) throw new Error("Firestore or Business not available");

        const batch = writeBatch(firestore);
        const customersRef = collection(firestore, 'customers');
        const effectiveEmail = email.trim() ? email.toLowerCase().trim() : `${phone.replace(/[^\d]/g, '') || Date.now()}@customer.chat`;

        const newCustomerRef = doc(customersRef);
        batch.set(newCustomerRef, {
            name: name.trim(),
            email: effectiveEmail,
            phone: phone.trim(),
            businessId: business.id,
            createdAt: serverTimestamp(),
            loyaltyPoints: 0,
            source: paymentDetails.method === 'In-Store Chat' ? 'in_store_chat' : paymentDetails.method === 'WhatsApp' ? 'whatsapp_store' : 'online_store'
        });

        const orderData: Omit<OnlineOrder, 'id'> = {
            businessId: business.id,
            customerId: newCustomerRef.id,
            customerName: name.trim(),
            customerEmail: effectiveEmail,
            customerPhone: phone.trim(),
            customerAddress: address.trim(),
            items: cart.map(item => ({
                productId: item.product.id,
                name: item.product.name,
                quantity: item.quantity,
                price: item.product.price,
            })),
            total,
            shippingDetails: chosenShippingOption,
            status: paymentDetails.status,
            paymentMethod: paymentDetails.method,
            paymentReference: paymentDetails.reference,
            createdAt: serverTimestamp(),
        };

        const ordersRef = collection(firestore, 'businessInstances', business.id, 'onlineOrders');
        const newOrderRef = doc(ordersRef);
        batch.set(newOrderRef, orderData);

        await batch.commit();

        return { orderId: newOrderRef.id, finalCustomerName: name.trim() };
    }, [firestore, business, name, email, phone, address, cart, total, chosenShippingOption]);

    // ── Primary Action: Order via In-Store Live Chat ──────────────────────
    const handleLiveChatOrder = async () => {
        if (!business || !firestore) return;

        if (!name.trim() || !phone.trim() || !address.trim() || (shippingOptions.length > 0 && !selectedShipping)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'بيانات ناقصة' : 'Missing Details',
                description: lang === 'ar'
                    ? 'يرجى إدخال الاسم، رقم الهاتف، وعنوان التوصيل للمتابعة.'
                    : 'Please enter your Name, Phone Number, and Delivery Address to continue.',
            });
            return;
        }

        if (isCoreFeatureBlocked(business)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'المتجر غير متاح' : 'Store Unavailable',
                description: lang === 'ar' ? 'المتجر لا يستقبل طلبات جديدة حالياً.' : 'This store is currently not accepting new orders.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Record order in Firestore
            const { orderId } = await createOrderInFirestore({
                method: 'In-Store Chat',
                status: 'pending'
            });

            const orderRefCode = `#${orderId.slice(-6).toUpperCase()}`;

            // 2. Format Items list
            const itemsFormatted = cart
                .map(item => `• ${item.quantity}x ${item.product.name} — ${currencySymbol}${(item.product.price * item.quantity).toLocaleString()}`)
                .join('\n');

            let orderMessageText = '';
            if (lang === 'ar') {
                orderMessageText =
                    `📦 *طلب جديد من المتجر (${orderRefCode})*\n\n` +
                    `*العميل:* ${name.trim()}\n` +
                    `*الهاتف:* ${phone.trim()}\n` +
                    `*العنوان:* ${address.trim()}\n` +
                    (chosenShippingOption ? `*طريقة التوصيل:* ${chosenShippingOption.name}\n` : '') +
                    `\n*المنتجات المطلوبة:*\n` +
                    `${itemsFormatted}\n\n` +
                    `*المجموع الفرعي:* ${currencySymbol}${subtotal.toLocaleString()}\n` +
                    (shippingCost > 0 ? `*رسوم الشحن:* ${currencySymbol}${shippingCost.toLocaleString()}\n` : '') +
                    `*المبلغ الإجمالي:* ${currencySymbol}${total.toLocaleString()}`;
            } else {
                orderMessageText =
                    `📦 *New Store Order (${orderRefCode})*\n\n` +
                    `*Customer:* ${name.trim()}\n` +
                    `*Phone:* ${phone.trim()}\n` +
                    `*Address:* ${address.trim()}\n` +
                    (chosenShippingOption ? `*Shipping:* ${chosenShippingOption.name}\n` : '') +
                    `\n*Items Ordered:*\n` +
                    `${itemsFormatted}\n\n` +
                    `*Subtotal:* ${currencySymbol}${subtotal.toLocaleString()}\n` +
                    (shippingCost > 0 ? `*Shipping:* ${currencySymbol}${shippingCost.toLocaleString()}\n` : '') +
                    `*Total to Pay:* ${currencySymbol}${total.toLocaleString()}`;
            }

            // 3. Find or Create Customer Conversation in Firestore
            let convoId = localStorage.getItem(`zeneva_store_convo_${business.id}`);

            if (!convoId) {
                const convosRef = collection(firestore, 'businessInstances', business.id, 'conversations');
                const newConvo = await addDoc(convosRef, {
                    businessId: business.id,
                    customerName: name.trim(),
                    customerPhone: phone.trim(),
                    lastMessage: `New Order ${orderRefCode}: ${currencySymbol}${total.toLocaleString()}`,
                    lastSender: 'customer',
                    unreadCountStaff: 1,
                    unreadCountCustomer: 0,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                convoId = newConvo.id;
            } else {
                const convoRef = doc(firestore, 'businessInstances', business.id, 'conversations', convoId);
                await updateDoc(convoRef, {
                    customerName: name.trim(),
                    customerPhone: phone.trim(),
                    lastMessage: `New Order ${orderRefCode}: ${currencySymbol}${total.toLocaleString()}`,
                    lastSender: 'customer',
                    unreadCountStaff: increment(1),
                    status: 'active',
                    updatedAt: serverTimestamp(),
                });
            }

            // 4. Append order message to conversation subcollection
            const messagesRef = collection(
                firestore,
                'businessInstances',
                business.id,
                'conversations',
                convoId,
                'messages'
            );
            await addDoc(messagesRef, {
                conversationId: convoId,
                sender: 'customer',
                senderName: name.trim(),
                text: orderMessageText,
                productAttachment: cart[0]?.product ? {
                    productId: cart[0].product.id,
                    productName: cart[0].product.name,
                    price: cart[0].product.price,
                    stock: cart[0].product.stock ?? 1,
                    isInStock: true,
                    sku: cart[0].product.sku,
                    imageUrl: cart[0].product.imageUrl || null
                } : null,
                createdAt: serverTimestamp(),
                read: false,
            });

            // 5. Store customer info in localStorage
            localStorage.setItem(
                'zeneva_store_customer_info',
                JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() })
            );
            localStorage.setItem(`zeneva_store_convo_${business.id}`, convoId);

            // 6. Automatically open the in-store chat widget so customer sees their confirmation
            window.dispatchEvent(
                new CustomEvent('zeneva_open_chat', {
                    detail: { conversationId: convoId, name: name.trim() },
                })
            );

            toast({
                variant: 'success',
                title: lang === 'ar' ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!',
                description: lang === 'ar'
                    ? `رقم الطلب ${orderRefCode}. تم فتح المحادثة المباشرة مع المتجر لتأكيد الطلب.`
                    : `Order ${orderRefCode} placed. Live chat opened with the store team.`,
            });

            onOrderPlaced();
            resetForm();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Live chat order failed:', err);
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'فشل إرسال الطلب' : 'Order Placement Failed',
                description: err.message || 'Could not complete live chat order dispatch.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Secondary Action: Order via WhatsApp ──────────────────────────
    const handleWhatsAppOrder = async () => {
        if (!business) return;

        if (!name.trim() || !phone.trim() || !address.trim() || (shippingOptions.length > 0 && !selectedShipping)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'بيانات ناقصة' : 'Missing Details',
                description: lang === 'ar'
                    ? 'يرجى إدخال الاسم، رقم الهاتف، وعنوان التوصيل للمتابعة.'
                    : 'Please enter your Name, Phone Number, and Delivery Address to continue.',
            });
            return;
        }

        if (isCoreFeatureBlocked(business)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'المتجر غير متاح' : 'Store Unavailable',
                description: lang === 'ar' ? 'المتجر لا يستقبل طلبات جديدة حالياً.' : 'This store is currently not accepting new orders.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { orderId } = await createOrderInFirestore({
                method: 'WhatsApp',
                status: 'pending'
            });

            const settingsAny = (business.settings || {}) as any;
            const rawStorePhone =
                settingsAny.publicStore?.whatsappNumber ||
                settingsAny.whatsappNumber ||
                settingsAny.phone ||
                '';
            const cleanStorePhone = rawStorePhone.replace(/[^\d]/g, '');

            const itemsFormatted = cart
                .map(item => `• ${item.quantity}x ${item.product.name} — ${currencySymbol}${(item.product.price * item.quantity).toLocaleString()}`)
                .join('\n');

            let message = '';
            if (lang === 'ar') {
                message =
                    `السلام عليكم ورحمة الله،\n` +
                    `أود تأكيد طلب جديد من متجر *${business.name}*:\n\n` +
                    `*بيانات العميل:*\n` +
                    `• الاسم: ${name.trim()}\n` +
                    `• رقم الهاتف: ${phone.trim()}\n` +
                    `• العنوان: ${address.trim()}\n` +
                    (chosenShippingOption ? `• طريقة الاستلام: ${chosenShippingOption.name}\n` : '') +
                    `\n*المنتجات المطلوبة:*\n` +
                    `${itemsFormatted}\n\n` +
                    `*المجموع الفرعي:* ${currencySymbol}${subtotal.toLocaleString()}\n` +
                    (shippingCost > 0 ? `*رسوم الشحن:* ${currencySymbol}${shippingCost.toLocaleString()}\n` : '') +
                    `*الإجمالي المطلوب:* ${currencySymbol}${total.toLocaleString()}\n\n` +
                    `رقم الفاتورة: #${orderId.slice(-6).toUpperCase()}`;
            } else {
                message =
                    `Hello! I would like to place an order from *${business.name}*:\n\n` +
                    `*Customer Details:*\n` +
                    `• Name: ${name.trim()}\n` +
                    `• Phone: ${phone.trim()}\n` +
                    `• Address: ${address.trim()}\n` +
                    (chosenShippingOption ? `• Shipping: ${chosenShippingOption.name}\n` : '') +
                    `\n*Items Ordered:*\n` +
                    `${itemsFormatted}\n\n` +
                    `*Subtotal:* ${currencySymbol}${subtotal.toLocaleString()}\n` +
                    (shippingCost > 0 ? `*Shipping:* ${currencySymbol}${shippingCost.toLocaleString()}\n` : '') +
                    `*Total:* ${currencySymbol}${total.toLocaleString()}\n\n` +
                    `Order Ref: #${orderId.slice(-6).toUpperCase()}`;
            }

            const waUrl = cleanStorePhone
                ? `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(message)}`
                : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

            window.open(waUrl, '_blank');

            toast({
                variant: 'success',
                title: lang === 'ar' ? 'تم فتح واتساب!' : 'WhatsApp Opened!',
                description: `Order #${orderId.slice(-6).toUpperCase()} registered.`,
            });

            onOrderPlaced();
            resetForm();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'فشل الإرسال' : 'Order Placement Failed',
                description: err.message || 'Could not complete WhatsApp order dispatch.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Paystack Card Payment ─────────────────────────────────────────
    const handleSuccessfulPayment = React.useCallback(async (transaction: any) => {
        toast({ title: lang === 'ar' ? "جارٍ التحقق..." : "Processing...", description: lang === 'ar' ? "التحقق من الدفع بشكل آمن." : "Verifying your payment securely." });
        try {
            const isUSD = business?.settings?.currency === 'USD';
            const exchangeRate = business?.settings?.usdToNgnRate || 1500;
            const expectedPaystackAmount = isUSD ? Math.round(total * exchangeRate * 100) : Math.round(total * 100);
            const paymentRef = typeof transaction === 'string' ? transaction : (transaction?.reference || transaction?.ref || '');

            const verifyResponse = await fetch(`${apiBase()}/api/paystack/verify-transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reference: paymentRef,
                    expectedAmount: expectedPaystackAmount,
                    businessId: business?.id,
                    currency: isUSD ? 'NGN' : (business?.settings?.currency || 'NGN')
                }),
            });
            const verifyResult = await verifyResponse.json();
            if (!verifyResponse.ok || verifyResult.status !== 'success' || verifyResult.data.amount !== expectedPaystackAmount) {
                throw new Error(verifyResult.message || 'Payment verification failed.');
            }

            const { finalCustomerName } = await createOrderInFirestore({ method: 'Paystack', reference: transaction.reference, status: 'paid' });

            toast({
                variant: 'success',
                title: lang === 'ar' ? 'تم الدفع بنجاح!' : 'Order Placed!',
                description: lang === 'ar' ? `شكراً لك ${finalCustomerName}!` : `Thank you, ${finalCustomerName}! Your order has been placed.`
            });

            onOrderPlaced();
            resetForm();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Payment Error', description: error.message || 'There was an issue processing your payment.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [total, createOrderInFirestore, toast, onOrderPlaced, business, onOpenChange, lang]);

    const handlePlaceOrder = async () => {
        if (!business) return;

        if (!name.trim() || !phone.trim() || !address.trim() || (shippingOptions.length > 0 && !selectedShipping)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'بيانات ناقصة' : 'Missing Information',
                description: lang === 'ar' ? 'يرجى إكمال الاسم، الهاتف، وعنوان التوصيل.' : 'Please fill out Name, Phone, and Delivery Address.'
            });
            return;
        }

        if (isCoreFeatureBlocked(business)) {
            toast({
                variant: 'destructive',
                title: lang === 'ar' ? 'المتجر غير متاح' : 'Store Unavailable',
                description: lang === 'ar' ? 'المتجر لا يستقبل طلبات جديدة حالياً.' : 'This store is currently not accepting new orders.'
            });
            return;
        }

        if (!hasPaystack && !hasBankDetails) {
            await handleLiveChatOrder();
            return;
        }

        setIsSubmitting(true);

        if (hasPaystack) {
            if (!isScriptLoaded) {
                toast({ variant: "destructive", title: "Payment Gateway Not Ready", description: "Please wait a moment." });
                setIsSubmitting(false);
                return;
            }

            const isUSD = business?.settings?.currency === 'USD';
            const exchangeRate = business?.settings?.usdToNgnRate || 1500;
            const paystackAmount = isUSD ? Math.round(total * exchangeRate * 100) : Math.round(total * 100);
            const paystackCurrency = isUSD ? 'NGN' : (business?.settings?.currency || 'NGN');

            initializePayment({
                key: PAYSTACK_PUBLIC_KEY,
                email: email.trim() || `${phone.replace(/[^\d]/g, '')}@customer.chat`,
                amount: paystackAmount,
                currency: paystackCurrency,
                reference: `z-${business.id.substring(0, 6)}-${Date.now()}`,
                subaccount: business?.settings?.paystackSubaccount,
                onSuccess: handleSuccessfulPayment,
                onClose: () => setIsSubmitting(false),
            });
        } else {
            try {
                await createOrderInFirestore({ method: 'Bank Transfer', status: 'pending' });
                toast({
                    variant: 'success',
                    title: lang === 'ar' ? 'تم تسجيل الطلب!' : 'Order Placed!',
                    description: lang === 'ar' ? 'يرجى إتمام التحويل البنكي وفق الحساب الموضح أدناه.' : `Your order has been placed. Please complete payment via bank transfer.`
                });
                onOrderPlaced();
                resetForm();
                onOpenChange(false);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Order Failed', description: e.message || 'Could not place your order.' });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDialogChange = (open: boolean) => {
        if (!open) {
            resetForm();
        }
        onOpenChange(open);
    };

    if (!business) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogChange}>
            <DialogContent
                className="sm:max-w-lg flex flex-col h-full max-h-[95vh] p-0 overflow-hidden font-sans"
                dir={isRtl ? 'rtl' : 'ltr'}
            >
                {/* Header with Title and Language Toggle */}
                <DialogHeader className="p-5 pb-3 border-b bg-slate-50/70 flex flex-row items-center justify-between gap-3">
                    <div className="space-y-1 text-left rtl:text-right flex-1">
                        <DialogTitle className="text-lg font-bold text-slate-900">{t.title}</DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {t.subtitle}
                        </DialogDescription>
                    </div>

                    {/* Language Switcher Pill */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs shrink-0">
                        <Globe className="h-3.5 w-3.5 text-slate-400 ml-1" />
                        <button
                            type="button"
                            onClick={() => setLang('ar')}
                            className={cn(
                                "px-2 py-0.5 rounded-md text-xs font-semibold transition-colors",
                                lang === 'ar' ? "bg-orange-500 text-white" : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            العربية
                        </button>
                        <button
                            type="button"
                            onClick={() => setLang('en')}
                            className={cn(
                                "px-2 py-0.5 rounded-md text-xs font-semibold transition-colors",
                                lang === 'en' ? "bg-orange-500 text-white" : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            EN
                        </button>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-5 py-4">
                    <div className="space-y-4">
                        {/* Name and Phone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="checkout-name" className="text-xs font-semibold text-slate-700">
                                    {t.fullName}
                                </Label>
                                <Input
                                    id="checkout-name"
                                    placeholder={t.fullNamePlaceholder}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="text-xs h-9 bg-slate-50 border-slate-200"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="checkout-phone" className="text-xs font-semibold text-slate-700">
                                    {t.phone}
                                </Label>
                                <Input
                                    id="checkout-phone"
                                    type="tel"
                                    placeholder={t.phonePlaceholder}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="text-xs h-9 bg-slate-50 border-slate-200"
                                    required
                                />
                            </div>
                        </div>

                        {/* Optional Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="checkout-email" className="text-xs font-semibold text-slate-700">
                                {t.email}
                            </Label>
                            <Input
                                id="checkout-email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="text-xs h-9 bg-slate-50 border-slate-200"
                            />
                        </div>

                        {/* Delivery Address */}
                        <div className="space-y-1.5">
                            <Label htmlFor="checkout-address" className="text-xs font-semibold text-slate-700">
                                {t.address}
                            </Label>
                            <Textarea
                                id="checkout-address"
                                placeholder={t.addressPlaceholder}
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                className="text-xs bg-slate-50 border-slate-200 resize-none"
                                required
                                rows={2}
                            />
                        </div>

                        {/* Shipping Options if configured */}
                        {shippingOptions.length > 0 && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700">{t.deliveryMethod}</Label>
                                <Select onValueChange={setSelectedShipping} value={selectedShipping}>
                                    <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-200">
                                        <SelectValue placeholder={t.deliveryMethodPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shippingOptions.map(opt => (
                                            <SelectItem key={opt.name} value={opt.name} className="text-xs">
                                                <div className="flex justify-between items-center w-full gap-4">
                                                    <span>{opt.name}{opt.type === 'pickup' ? (lang === 'ar' ? ' (استلام)' : ' (Pickup)') : ''}</span>
                                                    <span className="font-semibold">{currencySymbol}{opt.price.toLocaleString()}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Order Summary Breakdown */}
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs shadow-2xs">
                            <div className="flex justify-between text-slate-500 font-medium">
                                <span>{t.subtotal} ({cart.reduce((s, i) => s + i.quantity, 0)} {t.items})</span>
                                <span className="text-slate-800">{currencySymbol}{subtotal.toLocaleString()}</span>
                            </div>
                            {shippingCost > 0 && (
                                <div className="flex justify-between text-slate-500 font-medium">
                                    <span>{t.shipping}</span>
                                    <span className="text-slate-800">{currencySymbol}{shippingCost.toLocaleString()}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold text-sm pt-0.5 text-slate-900">
                                <span>{t.totalToPay}</span>
                                <span className="text-orange-600 font-extrabold text-base">
                                    {currencySymbol}{total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Warm Orange In-Store Live Chat Order Notice (No Green!) */}
                        <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-orange-950">
                                <MessageSquare className="w-4 h-4 text-orange-600 shrink-0" />
                                <span>{t.chatNoticeTitle}</span>
                            </div>
                            <p className="text-slate-600 leading-relaxed text-[11px]">
                                {t.chatNoticeDesc}
                            </p>
                        </div>

                        {/* Bank Transfer Details if configured */}
                        {hasBankDetails && (
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                                    <Building className="w-3.5 h-3.5 text-orange-600" />
                                    <span>{t.bankDetailsTitle}</span>
                                </div>
                                <p className="text-slate-600 text-[11px]">
                                    {t.bankNotice}: <strong className="text-slate-900">{business?.settings?.paymentBankName}</strong> | {t.accountNotice}: <strong className="text-slate-900">{business?.settings?.paymentBankAccountId}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer Buttons: All styled in Orange & Neutral (No Green) */}
                <DialogFooter className="p-4 border-t bg-slate-50/60 flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="text-xs h-10 px-4 rounded-xl border-slate-200"
                    >
                        {t.cancel}
                    </Button>

                    {/* Secondary WhatsApp button if clean phone exists */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleWhatsAppOrder}
                        disabled={isSubmitting}
                        className="h-10 text-xs px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
                    >
                        <MessageCircle className="h-4 w-4 text-slate-600" />
                        <span>{t.orderViaWhatsApp}</span>
                    </Button>

                    {/* Primary Action Button: Order via In-Store Live Chat (Tangerine Orange) */}
                    <Button
                        type="button"
                        onClick={handleLiveChatOrder}
                        disabled={isSubmitting}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2 shadow-sm flex-1 sm:flex-none h-10 px-5 text-xs sm:text-sm rounded-xl"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <MessageSquare className="h-4 w-4" />
                        )}
                        <span>{t.orderViaChat}</span>
                    </Button>

                    {/* Pay with Card if Paystack configured */}
                    {hasPaystack && (
                        <Button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={isSubmitting}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2 flex-1 sm:flex-none h-10 px-4 text-xs rounded-xl"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            <span>{t.payCard}</span>
                        </Button>
                    )}

                    {!hasPaystack && hasBankDetails && (
                        <Button
                            type="button"
                            onClick={handlePlaceOrder}
                            disabled={isSubmitting}
                            variant="secondary"
                            className="font-semibold gap-2 flex-1 sm:flex-none h-10 px-4 text-xs rounded-xl"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{t.confirmBank}</span>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
