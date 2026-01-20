
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { Loader2, UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Customer } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';

interface ImportCustomersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  businessId: string;
  existingCustomers: Customer[];
}

type ParsedCustomer = Partial<Pick<Customer, 'name' | 'email' | 'phone'>>;

const HEADER_MAPPINGS: { [key: string]: string[] } = {
  name: ['Name', 'Full Name', 'Customer Name'],
  email: ['Email', 'Email Address'],
  phone: ['Phone', 'Phone Number'],
};

export default function ImportCustomersDialog({ isOpen, onOpenChange, onSuccess, businessId, existingCustomers }: ImportCustomersDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedCustomer[]>([]);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const existingEmails = React.useMemo(() => new Set(existingCustomers.map(c => c.email.toLowerCase())), [existingCustomers]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv') {
        setError('Invalid file type. Please upload a CSV file.');
        setFile(null);
        setParsedData([]);
        return;
      }
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  };

  const parseFile = (fileToParse: File) => {
    setIsParsing(true);
    setParsedData([]);
    Papa.parse(fileToParse, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields;
        if (!headers) {
          setError('Could not read headers from CSV file.');
          setIsParsing(false);
          return;
        }

        const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
        const findHeader = (possibleNames: string[]): string | undefined => {
            for (const name of possibleNames) {
                const lowerName = name.toLowerCase();
                const index = lowerCaseHeaders.indexOf(lowerName);
                if (index !== -1) {
                    return headers[index];
                }
            }
            return undefined;
        };
        
        const mappedHeaders = {
            name: findHeader(HEADER_MAPPINGS.name),
            email: findHeader(HEADER_MAPPINGS.email),
            phone: findHeader(HEADER_MAPPINGS.phone),
        };

        if (!mappedHeaders.name || !mappedHeaders.email) {
          setError("CSV must contain at least 'Name' and 'Email' columns.");
          setIsParsing(false);
          return;
        }

        const data: ParsedCustomer[] = results.data.map((row: any) => ({
          name: row[mappedHeaders.name!] || undefined,
          email: row[mappedHeaders.email!] || undefined,
          phone: mappedHeaders.phone ? row[mappedHeaders.phone] || '' : '',
        }));
        
        const validData = data.filter(d => d.name && d.email);
        const newData = validData.filter(d => d.email && !existingEmails.has(d.email.toLowerCase()));

        if(newData.length !== validData.length) {
            toast({
                variant: 'warning',
                title: 'Duplicates Found',
                description: `${validData.length - newData.length} customers already exist and will be skipped.`
            })
        }

        setParsedData(newData);
        setIsParsing(false);
      },
      error: (err) => {
        setError(err.message);
        setIsParsing(false);
      }
    });
  };

  const handleImport = async () => {
    if (!businessId || !firestore || parsedData.length === 0) return;
    setIsImporting(true);
    try {
      const batch = writeBatch(firestore);
      const customersRef = collection(firestore, 'customers');
      
      parsedData.forEach(customerData => {
        if (customerData.name && customerData.email) {
          const newCustomerRef = doc(customersRef);
          batch.set(newCustomerRef, {
            ...customerData,
            businessId,
            loyaltyPoints: 0,
            createdAt: serverTimestamp(),
          });
        }
      });

      await batch.commit();
      
      toast({
        variant: 'success',
        title: 'Import Successful',
        description: `${parsedData.length} new customers have been added.`,
      });
      onSuccess();
    } catch (e) {
      console.error("Import failed:", e);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'An error occurred while saving the customers. Please try again.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    setIsParsing(false);
    setIsImporting(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-add customers. Ensure your file has columns for 'Name' and 'Email'.
          </DialogDescription>
        </DialogHeader>
        
        {!file ? (
             <div className="mt-4 flex justify-center rounded-lg border-2 border-dashed border-border px-6 py-10">
                <div className="text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                    <label
                        htmlFor="customer-file-upload"
                        className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:text-primary/80"
                    >
                        <span>Upload a file</span>
                        <input id="customer-file-upload" name="customer-file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                    <p className="text-xs leading-5 text-muted-foreground">CSV up to 5MB</p>
                </div>
            </div>
        ): (
            <div className='mt-4'>
                <div className='flex items-center gap-3 p-3 rounded-lg bg-muted border'>
                    <FileSpreadsheet className="h-6 w-6 text-primary"/>
                    <div className='flex-1'>
                        <p className='text-sm font-medium'>{file.name}</p>
                        <p className='text-xs text-muted-foreground'>
                            {isParsing ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-1"/> : <CheckCircle className="h-4 w-4 text-green-500 inline-block mr-1"/>}
                            {isParsing ? 'Parsing...' : `${parsedData.length} new customers found.`}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParsedData([]); }}>Change file</Button>
                </div>

                {parsedData.length > 0 && (
                    <div className='mt-4'>
                        <h4 className='text-sm font-medium mb-2'>Preview of new customers to import:</h4>
                        <ScrollArea className="h-60">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Phone</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.slice(0, 10).map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{p.name}</TableCell>
                                            <TableCell>{p.email}</TableCell>
                                            <TableCell>{p.phone || 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                         {parsedData.length > 10 && <p className='text-xs text-muted-foreground text-center mt-2'>...and {parsedData.length - 10} more rows.</p>}
                    </div>
                )}
            </div>
        )}
        
        {error && (
             <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-5 w-5"/>
                <p className="text-sm">{error}</p>
             </div>
        )}

        <DialogFooter className='mt-4'>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="lg" onClick={handleImport} disabled={isParsing || isImporting || parsedData.length === 0 || !!error || !businessId}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            {isImporting ? 'Importing...' : `Import ${parsedData.length} Customers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
