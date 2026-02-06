
'use client';
import ReceiptDetails from "@/components/receipts/receipt-details";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Printer, Share2, Loader2, PlusCircle } from "lucide-react";
import { useParams, notFound } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Receipt } from "@/types";
import { useBusiness, CURRENCY_SYMBOLS } from "@/context/pos-context";
import Link from 'next/link';


export default function ReceiptPage() {
  const { toast } = useToast();
  const params = useParams();
  const receiptId = params.id as string;
  
  const firestore = useFirestore();
  const [receiptData, setReceiptData] = useState<Receipt | null>(null);

  // Attempt to load optimistic data first
  useEffect(() => {
    try {
      const optimisticData = sessionStorage.getItem(`optimistic-receipt-${receiptId}`);
      if (optimisticData) {
        const parsedData = JSON.parse(optimisticData);
        // Convert ISO string back to Date object for consistency
        setReceiptData({ ...parsedData, createdAt: new Date(parsedData.createdAt) });
        // Clean up immediately
        sessionStorage.removeItem(`optimistic-receipt-${receiptId}`);
      }
    } catch (e) {
      console.error("Could not load optimistic receipt", e);
    }
  }, [receiptId]);

  const receiptRef = useMemoFirebase(() => (firestore && receiptId ? doc(firestore, 'receipts', receiptId) : null), [firestore, receiptId]);
  const { data: serverReceipt, isLoading: isServerLoading, error } = useDoc<Receipt>(receiptRef);

  // When server data arrives, it becomes the source of truth
  useEffect(() => {
    if (serverReceipt) {
      setReceiptData(serverReceipt);
    }
  }, [serverReceipt]);

  const isLoading = isServerLoading && !receiptData;
  const receipt = receiptData;
  const business = useBusiness();
  const currencySymbol = business?.settings?.currency ? CURRENCY_SYMBOLS[business.settings.currency] : '₦';

  const receiptContentRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading Receipt...</span></div>;
  }
  
  // If still no receipt after loading (and there's an error), it's a true notFound
  if (!receipt && !isLoading) {
    if (error) {
      // The permission error will be caught by Next.js error boundary,
      // but we can log it here for debugging if needed.
      console.error("Receipt fetch error:", error);
    }
    return notFound();
  }
  
  if (!receipt) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Finalizing Receipt...</span></div>;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (receiptContentRef.current) {
      const canvas = await html2canvas(receiptContentRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`receipt-${receipt.id.substring(0,8)}.pdf`);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
            title: "Link Copied",
            description: "Receipt link has been copied to your clipboard.",
            variant: 'success'
        });
    }, () => {
        toast({
            title: "Copy Failed",
            description: "Could not copy link to clipboard.",
            variant: 'destructive'
        });
    });
  };

  const handleShare = async () => {
    const shareData = {
        title: `Receipt ${receipt.id.substring(0,8)}`,
        text: `Here is your receipt from ${business?.name || 'our store'} for ${currencySymbol}${receipt.total.toFixed(2)}.`,
        url: window.location.href,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
                 toast({
                    title: "Share failed",
                    description: "Link copied to clipboard instead.",
                    variant: 'warning',
                });
                copyToClipboard();
            }
        }
    } else {
        copyToClipboard();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={receiptContentRef}>
        <ReceiptDetails receipt={receipt} business={business} currencySymbol={currencySymbol} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 no-print">
        <Button asChild>
            <Link href="/sales/pos/select-products"><PlusCircle className="mr-2 h-4 w-4" /> New Sale</Link>
        </Button>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button onClick={handleShare} variant="outline">
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </div>
    </div>
  );
}
