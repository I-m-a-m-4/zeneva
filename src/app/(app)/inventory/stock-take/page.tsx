'use client';

import * as React from 'react';
import { Camera, Upload, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import PageTitle from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePOS } from '@/context/pos-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function VisualStockTakePage() {
  const { products, updateProduct, activeBranchId } = usePOS();
  const { toast } = useToast();
  const router = useRouter();
  
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanResults, setScanResults] = React.useState<Array<{ id: string, expected: number, counted: number, name: string }>>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setScanResults([]); // Reset on new image
    };
    reader.readAsDataURL(file);
  };

  const startScan = async () => {
    if (!imagePreview || !products) return;

    setIsScanning(true);
    try {
      // We only want to send non-service products to the AI
      const inventoryItems = products.filter(p => p.categoryType !== 'service').map(p => ({
        id: p.id,
        name: p.name,
      }));

      const res = await fetch('/api/ai/scan-shelf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imagePreview,
          products: inventoryItems
        })
      });

      if (!res.ok) {
        throw new Error("Failed to analyze image");
      }

      const data = await res.json();
      const counts = data.result || [];

      // Map back to our products to show expected vs counted
      const results = counts.map((c: { id: string, count: number }) => {
        const product = products.find(p => p.id === c.id);
        return {
          id: c.id,
          name: product?.name || 'Unknown',
          expected: product?.stock || 0,
          counted: c.count
        };
      });

      setScanResults(results);
      toast({
        title: "Scan Complete",
        description: `Found ${results.length} unique products on the shelf.`,
        variant: "success"
      });

    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "An error occurred while analyzing the shelf",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleReconcile = async () => {
    try {
      // Update each product's stock to match the counted value
      const promises = scanResults.map(result => {
        if (result.expected !== result.counted) {
          return updateProduct(result.id, {
            stock: result.counted
          });
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      
      toast({
        title: "Reconciliation Complete",
        description: "Stock levels have been updated to match the shelf count.",
        variant: "success"
      });
      
      router.push('/inventory');
    } catch (error) {
      toast({
        title: "Reconciliation Failed",
        description: "Could not update stock levels. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <PageTitle 
        title="Visual Stock Take" 
        subtitle="Upload a photo of your shelf to automatically count stock and reconcile with Zeneva." 
      />

      <div className="grid md:grid-cols-2 gap-12 mt-4">
        {/* Left Column: Image Upload & Preview */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight"><Camera className="w-6 h-6 text-primary" /> Shelf Image</h2>
            <p className="text-muted-foreground mt-1">Take a clear photo of the products on your shelf.</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            {imagePreview ? (
              <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Shelf preview" className="w-full h-auto object-contain max-h-[500px]" />
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="absolute top-3 right-3 shadow-md opacity-90 hover:opacity-100"
                  onClick={() => setImagePreview(null)}
                >
                  Change Photo
                </Button>
              </div>
            ) : (
              <div 
                className="w-full h-72 border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="text-base font-semibold">Click to upload or take a picture</p>
                <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </div>
          
          <div>
            <Button 
              className="w-full h-12 text-base" 
              disabled={!imagePreview || isScanning} 
              onClick={startScan}
            >
              {isScanning ? (
                <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Analyzing Shelf...</>
              ) : (
                <><Camera className="mr-2 h-5 w-5" /> Scan Shelf</>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Results & Reconciliation */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 tracking-tight"><CheckCircle2 className="w-6 h-6 text-primary" /> Reconciliation</h2>
            <p className="text-muted-foreground mt-1">Review the counted items against expected stock.</p>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[600px]">
            {scanResults.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanResults.map(result => {
                    const variance = result.counted - result.expected;
                    return (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell className="text-right">{result.expected}</TableCell>
                        <TableCell className="text-right font-semibold">{result.counted}</TableCell>
                        <TableCell className="text-right">
                          {variance === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">Match</Badge>
                          ) : variance > 0 ? (
                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">+{variance}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">{variance}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-muted-foreground text-center px-4">
                <AlertCircle className="h-10 w-10 mb-4 opacity-20" />
                <p className="text-base font-medium">No scan results yet.</p>
                <p className="text-sm mt-1">Upload an image and run a scan to see discrepancies.</p>
              </div>
            )}
          </div>
          
          <div>
            <Button 
              className="w-full h-12 text-base" 
              variant="default"
              disabled={scanResults.length === 0}
              onClick={handleReconcile}
            >
              Update Inventory Stock
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
