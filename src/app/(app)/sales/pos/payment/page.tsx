
'use client';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { usePOS } from "@/context/pos-context";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Banknote, CreditCard, Landmark, Loader2, FileText } from "lucide-react";
import { useBusiness } from '@/context/pos-context';
import { useRouter } from 'next/navigation';

export default function PaymentPage() {
    const { subtotal, tax, taxRate, discount, total, setTax, setDiscount, paymentMethod, setPaymentMethod, currencySymbol, autoPrint, setAutoPrint } = usePOS();
    const business = useBusiness();
    const router = useRouter();
    const [isNavigating, setIsNavigating] = React.useState(false);

    const handleNext = () => {
        setIsNavigating(true);
        // Added a timeout safeguard to prevent the button from being stuck if navigation is slow
        const timer = setTimeout(() => setIsNavigating(false), 5000);
        
        if (autoPrint) {
            router.push('/sales/pos/review?auto=true');
        } else {
            router.push('/sales/pos/review');
        }
        
        return () => clearTimeout(timer);
    };

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Payment Method</CardTitle>
                        <CardDescription>Select how the customer will pay.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Label htmlFor="cash" className="cursor-pointer">
                                <Card className={`flex flex-col items-center justify-center p-6 ${paymentMethod === 'Cash' ? 'border-primary ring-1 ring-primary' : ''} hover:border-primary hover:bg-muted transition-colors h-full`}>
                                    <RadioGroupItem value="Cash" id="cash" className="sr-only" />
                                    <Banknote className="h-8 w-8 mb-2" />
                                    <span className="font-semibold text-sm">Cash</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Direct Cash Payment</span>
                                </Card>
                            </Label>
                            <Label htmlFor="card" className="cursor-pointer">
                                <Card className={`flex flex-col items-center justify-center p-6 ${paymentMethod === 'Card' ? 'border-primary ring-1 ring-primary' : ''} hover:border-primary hover:bg-muted transition-colors h-full`}>
                                    <RadioGroupItem value="Card" id="card" className="sr-only" />
                                    <CreditCard className="h-8 w-8 mb-2" />
                                    <span className="font-semibold text-sm">Card</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">POS Card Payment</span>
                                </Card>
                            </Label>
                            <Label htmlFor="bank" className="cursor-pointer">
                                <Card className={`flex flex-col items-center justify-center p-6 ${paymentMethod === 'Bank Transfer' ? 'border-primary ring-1 ring-primary' : ''} hover:border-primary hover:bg-muted transition-colors h-full`}>
                                    <RadioGroupItem value="Bank Transfer" id="bank" className="sr-only" />
                                    <Landmark className="h-8 w-8 mb-2" />
                                    <span className="font-semibold text-sm">Bank Transfer</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Direct Bank Deposit</span>
                                </Card>
                            </Label>
                            <Label htmlFor="invoice" className="cursor-pointer">
                                <Card className={`flex flex-col items-center justify-center p-6 ${paymentMethod === 'Invoice' ? 'border-primary ring-1 ring-primary' : ''} hover:border-primary hover:bg-muted transition-colors h-full`}>
                                    <RadioGroupItem value="Invoice" id="invoice" className="sr-only" />
                                    <FileText className="h-8 w-8 mb-2" />
                                    <span className="font-semibold text-sm">Invoice</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Pay Later / Credit</span>
                                </Card>
                            </Label>
                        </RadioGroup>
                        {paymentMethod === 'Invoice' && (
                            <Alert className="mt-4 bg-blue-50 border-blue-200">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <AlertTitle className="text-blue-800">Issue Professional Invoice</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    This will record the sale and deduct stock, but mark the payment as <strong>Unpaid</strong>. You can track this in the Invoices section.
                                </AlertDescription>
                            </Alert>
                        )}
                        {paymentMethod === 'Bank Transfer' && (
                            <Alert className="mt-4">
                                <Landmark className="h-4 w-4" />
                                <AlertTitle>Bank Transfer Details</AlertTitle>
                                <AlertDescription>
                                    Please instruct the customer to transfer to:<br />
                                    <strong>Bank:</strong> {business?.settings?.paymentBankName || 'Not configured'}<br />
                                    <strong>Account:</strong> {business?.settings?.paymentBankAccountId || 'Not configured'}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Discount & Tax</CardTitle>
                        <CardDescription>Apply discounts or adjust tax rates for this sale.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="discount">Discount ({currencySymbol})</Label>
                            <Input id="discount" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax">Tax Rate (%)</Label>
                            <Input id="tax" type="number" value={taxRate} onChange={e => setTax(Number(e.target.value))} />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{currencySymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax</span>
                            <span>{currencySymbol}{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-destructive">-{currencySymbol}{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <Separator />
                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="auto-print" className="cursor-pointer font-medium text-sm">
                                Print Receipt
                            </Label>
                            <input
                                type="checkbox"
                                id="auto-print"
                                className="w-4 h-4 cursor-pointer"
                                checked={autoPrint}
                                onChange={(e) => setAutoPrint(e.target.checked)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full h-12 text-lg" onClick={handleNext} disabled={isNavigating}>
                            {isNavigating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {autoPrint ? 'Finalize & Print' : 'Review & Complete'}
                        </Button>
                        <Button className="w-full" variant="outline" asChild>
                            <Link href="/sales/pos/customer">Back</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
