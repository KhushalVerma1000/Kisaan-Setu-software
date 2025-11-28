"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft,
  Edit,
  Printer,
  Download,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import LedgerAccountSelect from "@/components/ledgers/LedgerAccountSelectComponent";

interface EntryLine {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
}

interface JournalEntries {
  debitEntries: EntryLine[];
  creditEntries: EntryLine[];
}

// Format currency helper
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date helper
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export default function ViewJournalVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;
  
  // Form state
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");
  const [journalType, setJournalType] = useState<string>("other");
  
  const [entries, setEntries] = useState<JournalEntries>({
    debitEntries: [],
    creditEntries: []
  });
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing voucher data
  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/vouchers/${voucherId}`);
        const result = await response.json();

        if (result.success && result.data) {
          const { voucher, ledgerEntries } = result.data;

          // Set basic voucher info
          setVoucherNumber(voucher.voucherNumber);
          setDate(new Date(voucher.date));
          setNarration(voucher.description);

          // Extract journal type from notes if available
          if (voucher.notes && voucher.notes.startsWith('Journal Type: ')) {
            const type = voucher.notes.replace('Journal Type: ', '');
            setJournalType(type);
          }

          // Parse ledger entries into debit/credit entries
          const debitEntries: EntryLine[] = [];
          const creditEntries: EntryLine[] = [];

          ledgerEntries.forEach((entry: any) => {
            const journalEntry: EntryLine = {
              id: entry.id,
              accountId: entry.ledgerAccountId,
              accountName: entry.ledgerReference || "Unknown Account",
              amount: entry.amount
            };

            if (entry.type === "Dr") {
              debitEntries.push(journalEntry);
            } else if (entry.type === "Cr") {
              creditEntries.push(journalEntry);
            }
          });

          setEntries({ debitEntries, creditEntries });
        } else {
          toast.error(result.error || "Failed to fetch voucher data");
          router.push("/Journal");
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error("Failed to fetch voucher data");
        router.push("/Journal");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoucherData();
  }, [voucherId, router]);

  // Calculate totals
  const totals = {
    debit: entries.debitEntries.reduce((sum, e) => sum + e.amount, 0),
    credit: entries.creditEntries.reduce((sum, e) => sum + e.amount, 0),
  };

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  const handleEdit = () => {
    router.push(`/Journal/edit/${voucherId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.info("Download functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading voucher...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
  
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Journal Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">{voucherNumber}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Journal Voucher Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  View complete journal entry information
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-700">{formatAmount(totals.debit)}</div>
                <div className="text-xs text-muted-foreground mt-1">Entry Amount</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Voucher Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <Label>Voucher Number</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md">
                  {voucherNumber}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <Label>Voucher Date</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md">
                  {formatDate(date)}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <Label>Journal Type</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md capitalize">
                  {journalType}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Debit Entries Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-blue-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Debit Entries
              </Label>
              
              <div className="space-y-3">
                {entries.debitEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="space-y-3">
                      {/* Entry Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-1 rounded">
                          Debit Entry {index + 1}
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                          {formatAmount(entry.amount)}
                        </span>
                      </div>

                      {/* Account Details */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Ledger Account</div>
                        <LedgerAccountSelect
                          value={entry.accountId}
                          onValueChange={() => {}}
                          placeholder="Select Debit Account"
                          showGroupName={true}
                          editable={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {entries.debitEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <p className="text-sm text-muted-foreground">No debit entries</p>
                  </div>
                )}
              </div>

              {/* Debit Summary */}
              {entries.debitEntries.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-blue-900 font-medium">Total Debit Amount</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {entries.debitEntries.length} {entries.debitEntries.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">{formatAmount(totals.debit)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Credit Entries Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-green-900 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Credit Entries
              </Label>
              
              <div className="space-y-3">
                {entries.creditEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <div className="space-y-3">
                      {/* Entry Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-900 bg-green-100 px-2 py-1 rounded">
                          Credit Entry {index + 1}
                        </span>
                        <span className="text-lg font-bold text-green-700">
                          {formatAmount(entry.amount)}
                        </span>
                      </div>

                      {/* Account Details */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Ledger Account</div>
                        <LedgerAccountSelect
                          value={entry.accountId}
                          onValueChange={() => {}}
                          placeholder="Select Credit Account"
                          showGroupName={true}
                          editable={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {entries.creditEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <p className="text-sm text-muted-foreground">No credit entries</p>
                  </div>
                )}
              </div>

              {/* Credit Summary */}
              {entries.creditEntries.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-green-900 font-medium">Total Credit Amount</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {entries.creditEntries.length} {entries.creditEntries.length === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">{formatAmount(totals.credit)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Narration */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Narration</Label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm whitespace-pre-wrap">{narration}</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Balance Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Debit</p>
                    <p className="text-2xl font-bold text-blue-700">{formatAmount(totals.debit)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Credit</p>
                    <p className="text-2xl font-bold text-green-700">{formatAmount(totals.credit)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Balance Check */}
            {isBalanced ? (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Entries are balanced</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      Debit and credit amounts match perfectly
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Entries are not balanced</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Difference: {formatAmount(Math.abs(totals.debit - totals.credit))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}