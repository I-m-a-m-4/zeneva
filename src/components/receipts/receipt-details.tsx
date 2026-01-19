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
}

const Watermark = ({ businessName }: { businessName: string }) => (
    <div className="watermark absolute inset-0 flex items-center justify-center text-gray-200 text-8xl font-bold uppercase select-none -z-10 opacity-30 -rotate-45">
        {businessName.split(' ').slice(0, 2).join(' ')}
    </div>
);

const ReceiptDetails = React.forwardRef<HTMLDivElement, ReceiptDetailsProps>(
    ({ receipt, business, currencySymbol = '$' }, ref) => {
        const businessName = business?.name || 'Your Business';
        const businessAddress = business?.address || '';

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
                            <span>{receipt.createdAt ? format(receipt.createdAt instanceof Date ? receipt.createdAt : receipt.createdAt.toDate(), 'PPp') : 'N/A'}</span>
                        </div>
                        
                        {receipt.customer && (
                            <>
                            <Separator className="my-2"/>
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
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span className="text-destructive">-{currencySymbol}{receipt.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
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
