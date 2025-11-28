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
  CreditCard,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";
import LedgerAccountSelect from "@/components/ledgers/LedgerAccountSelectComponent";

interface ReceiptEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
}

interface VoucherData {
  voucherNumber: string;
  date: Date;
  narration: string;
  cashBankAccount: {
    id: string;
    name: string;
  };
  receiptEntries: ReceiptEntry[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
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

export default function ViewReceiptVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;

  const [voucherData, setVoucherData] = useState<VoucherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch voucher data
  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/vouchers/${voucherId}`);
        const result = await response.json();

        if (result.success && result.data) {
          const { voucher, ledgerEntries } = result.data;

          // Parse ledger entries
          const receiptEntries: ReceiptEntry[] = [];
          let cashBankAccount = { id: "", name: "" };

          ledgerEntries.forEach((entry: any) => {
            if (entry.type === "Dr") {
              // Debit entry is the cash/bank account (money coming in)
              cashBankAccount = {
                id: entry.ledgerAccountId,
                name: entry.ledgerReference || "Unknown Account"
              };
            } else if (entry.type === "Cr") {
              // Credit entries are the receipt sources
              receiptEntries.push({
                id: entry.id,
                accountId: entry.ledgerAccountId,
                accountName: entry.ledgerReference || "Unknown Account",
                amount: entry.amount,
                description: entry.secondaryDescription || ""
              });
            }
          });

          setVoucherData({
            voucherNumber: voucher.voucherNumber,
            date: new Date(voucher.date),
            narration: voucher.description,
            cashBankAccount,
            receiptEntries,
            createdAt: voucher.createdAt ? new Date(voucher.createdAt) : undefined,
            updatedAt: voucher.updatedAt ? new Date(voucher.updatedAt) : undefined,
            createdBy: voucher.createdBy
          });
        } else {
          toast.error(result.error || "Failed to fetch voucher data");
          router.push("/PaymentReceiptContra");
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error("Failed to fetch voucher data");
        router.push("/PaymentReceiptContra");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoucherData();
  }, [voucherId, router]);

  const handleEdit = () => {
    router.push(`/PaymentReceiptContra/Receipt/edit/${voucherId}`);
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

  if (!voucherData) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Voucher not found</p>
        </div>
      </div>
    );
  }

  const totalAmount = voucherData.receiptEntries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <Breadcrumb className="print:hidden">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/payRecContra">Accounting</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/payRecContra/receipt">Receipt Vouchers</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>View Voucher</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Receipt Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">{voucherData.voucherNumber}</p>
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

        {/* Main Content Card */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Receipt Voucher Details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  View complete receipt voucher information
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">{formatAmount(totalAmount)}</div>
                <div className="text-xs text-muted-foreground mt-1">Total Amount</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Voucher Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <Label>Voucher Number</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md">
                  {voucherData.voucherNumber}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <Label>Voucher Date</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md">
                  {formatDate(voucherData.date)}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <Label>Receipt Entries</Label>
                </div>
                <div className="text-base font-semibold p-3 bg-gray-50 rounded-md">
                  {voucherData.receiptEntries.length} {voucherData.receiptEntries.length === 1 ? 'Entry' : 'Entries'}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Cash/Bank Account Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-green-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Received Into (Cash/Bank Account)
              </Label>
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Account Details</div>
                    <LedgerAccountSelect
                      value={voucherData.cashBankAccount.id}
                      onValueChange={() => {}}
                      placeholder="Account"
                      groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                      showGroupName={true}
                      editable={false}
                    />
                  </div>
                  <div className="pt-3 border-t border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-900">Total Receipt Amount:</span>
                      <span className="text-2xl font-bold text-green-700">{formatAmount(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Receipt Entries Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-blue-900">
                Received From (Income/Asset Accounts)
              </Label>

              <div className="space-y-3">
                {voucherData.receiptEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="space-y-3">
                      {/* Entry Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-1 rounded">
                          Entry {index + 1}
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                          {formatAmount(entry.amount)}
                        </span>
                      </div>

                      {/* Account Details */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Account</div>
                        <LedgerAccountSelect
                          value={entry.accountId}
                          onValueChange={() => {}}
                          placeholder="Account"
                          showGroupName={true}
                          editable={false}
                          groupNames={[
                            "Sundry Debtors",
                            "Current Liabilities",
                            "Capital Account",
                            "Direct Incomes",
                            "Indirect Incomes",
                            "Sales Accounts",
                            "Loans (Liability)",
                            "Duties & Taxes"
                          ]}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Description</div>
                        <div className="p-3 bg-white rounded-md border border-blue-200">
                          <p className="text-sm">{entry.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Box */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-blue-900 font-medium">Total Receipts Received</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {voucherData.receiptEntries.length} receipt {voucherData.receiptEntries.length === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-700">{formatAmount(totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Narration */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Narration</Label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm whitespace-pre-wrap">{voucherData.narration}</p>
              </div>
            </div>

            {/* Metadata */}
            {(voucherData.createdAt || voucherData.updatedAt) && (
              <>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                  {voucherData.createdAt && (
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {formatDate(voucherData.createdAt)}
                    </div>
                  )}
                  {voucherData.updatedAt && (
                    <div>
                      <span className="font-medium">Last Updated:</span>{' '}
                      {formatDate(voucherData.updatedAt)}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Transaction Summary Card */}
        {/* <Card className="shadow-sm print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Cash/Bank Account (Debit)</span>
                <span className="font-medium text-green-600">+ {formatAmount(totalAmount)}</span>
              </div>
              {voucherData.receiptEntries.map((entry, index) => (
                <div key={entry.id} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {entry.accountName} (Credit)
                  </span>
                  <span className="font-medium text-blue-600">- {formatAmount(entry.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-3 pt-4 font-semibold text-base">
                <span>Net Balance</span>
                <span className="text-primary">{formatAmount(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}