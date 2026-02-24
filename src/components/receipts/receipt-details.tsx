import * as React from "react";
import type { Receipt } from "@/types";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import type { BusinessInstance } from "@/types";

interface ReceiptDetailsProps {
    receipt: Receipt;
    business?: BusinessInstance | null;
    currencySymbol?: string;
    isInvoice?: boolean;
}

const Watermark = ({ businessName }: { businessName: string }) => (
    <div className="watermark absolute inset-0 flex items-center justify-center text-gray-200 text-8xl font-bold uppercase select-none -z-10 opacity-30 -rotate-45 pointer-events-none">
        {businessName.split(' ').slice(0, 2).join(' ')}
    </div>
);

const ReceiptDetails = React.forwardRef<HTMLDivElement, ReceiptDetailsProps>(
    ({ receipt, business, currencySymbol = '₦', isInvoice = false }, ref) => {
        const businessName = business?.name || 'Your Business';
        const businessAddress = business?.address || '';

        // If it's an invoice, we use a slightly more structured layout but keep it simple as requested
        if (isInvoice) {
            return (
                <div ref={ref}>
                    <Card className="w-full max-w-2xl mx-auto relative overflow-hidden print-receipt p-6">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-primary">{businessName}</h1>
                                <p className="text-muted-foreground whitespace-pre-wrap">{businessAddress}</p>
                                {business?.settings?.phone && <p className="text-sm">Tel: {business.settings.phone}</p>}
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold uppercase text-primary">Invoice</h2>
                                <p className="font-medium">#{receipt.receiptNumber || receipt.id.substring(0, 8).toUpperCase()}</p>
                                <p className="text-sm text-muted-foreground">
                                    {receipt.createdAt ? format(receipt.createdAt instanceof Date ? receipt.createdAt : (receipt.createdAt.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt)), 'PPP') : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Billed To:</h3>
                                <p className="font-semibold">{receipt.customer?.name || 'Walk-in Customer'}</p>
                                <p className="text-sm text-muted-foreground">{receipt.customer?.email || ''}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-1">Payment Status:</h3>
                                <p className="font-semibold capitalize">{receipt.status || (receipt.paymentMethod === 'Bank Transfer' ? 'pending' : 'paid')}</p>
                                <p className="text-sm text-muted-foreground">Via {receipt.paymentMethod}</p>
                            </div>
                        </div>

                        <table className="w-full mb-8 text-sm">
                            <thead className="border-b">
                                <tr className="text-left">
                                    <th className="py-2">Item</th>
                                    <th className="py-2 text-center">Qty</th>
                                    <th className="py-2 text-right">Price</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {receipt.items.map((item, index) => (
                                    <tr key={item.productId + index}>
                                        <td className="py-3 font-medium">{item.name}</td>
                                        <td className="py-3 text-center">{item.quantity}</td>
                                        <td className="py-3 text-right">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 text-right">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end mb-8">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tax</span>
                                    <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {receipt.discount > 0 && (
                                    <div className="flex justify-between text-sm text-destructive font-medium">
                                        <span>Discount</span>
                                        <span>-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        {(business?.settings?.paymentBankName || business?.settings?.paymentInstructions) && (
                            <div className="mt-8 pt-6 border-t border-dashed">
                                <h3 className="text-sm font-bold mb-2">Payment Details</h3>
                                <div className="text-sm text-muted-foreground">
                                    {business.settings.paymentBankName && (
                                        <p>{business.settings.paymentBankName} | {business.settings.paymentAccountName} | {business.settings.paymentBankAccountId}</p>
                                    )}
                                    {business.settings.paymentInstructions && (
                                        <p className="mt-2 italic">{business.settings.paymentInstructions}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-12 text-center text-xs text-muted-foreground border-t pt-4">
                            <p>Thank you for your business!</p>
                            <p>Generated by Zeneva POS</p>
                        </div>
                    </Card>
                </div>
            );
        }

        // Default Receipt View (Classic)
        return (
            <div ref={ref}>
                <Card className="w-full max-w-md mx-auto relative overflow-hidden print-receipt">
                    <Watermark businessName={businessName} />
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-headline">{businessName}</CardTitle>
                        {businessAddress && <CardDescription>{businessAddress}</CardDescription>}
                    </CardHeader>
                    <CardContent className="text-sm">
                        <div className="flex justify-between mb-2">
                            <span>Receipt ID:</span>
                            <span>{receipt.receiptNumber || receipt.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between mb-4">
                            <span>Date:</span>
                            <span>{receipt.createdAt ? format(receipt.createdAt instanceof Date ? receipt.createdAt : (receipt.createdAt.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt)), 'PPp') : 'N/A'}</span>
                        </div>

                        {receipt.customer && (
                            <>
                                <Separator className="my-2" />
                                <div className="mb-2">
                                    <h3 className="font-semibold">Billed To:</h3>
                                    <p>{receipt.customer.name}</p>
                                    <p>{receipt.customer.email}</p>
                                </div>
                            </>
                        )}

                        <Separator className="my-4" />

                        <div>
                            {receipt.items.map((item, index) => (
                                <div key={item.productId + index} className="flex justify-between items-center mb-1">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-muted-foreground">
                                            {item.quantity} x {currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <p>{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            ))}
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{currencySymbol}{receipt.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{currencySymbol}{receipt.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {receipt.discount > 0 && (
                                <div className="flex justify-between">
                                    <span>Discount</span>
                                    <span className="text-destructive">-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>

                        <Separator className="my-4" />

                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{currencySymbol}{receipt.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                    </CardContent>
                    <CardFooter className="flex flex-col items-center text-center text-xs text-muted-foreground">
                        <p>Thank you for your business!</p>
                        <p>Payment Method: {receipt.paymentMethod}</p>
                    </CardFooter>
                </Card>
            </div>
        );
    }
);
ReceiptDetails.displayName = "ReceiptDetails";

export default ReceiptDetails;
