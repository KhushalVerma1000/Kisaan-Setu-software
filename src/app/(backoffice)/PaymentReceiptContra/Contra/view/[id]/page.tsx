"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface ContraEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
}

interface VoucherData {
  voucher: {
    voucherNumber: string;
    voucherType: string;
    date: string;
    description: string;
    notes: string;
    id: string;
  };
  ledgerEntries: Array<{
    id: string;
    ledgerAccountId: string;
    amount: number;
    type: "Dr" | "Cr";
    secondaryDescription: string;
    ledgerReference: string | null;
  }>;
  fromEntries: ContraEntry[];
  toEntries: ContraEntry[];
}

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export default function ViewContraVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params?.id as string;

  const [voucherData, setVoucherData] = useState<VoucherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVoucherData = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/vouchers/${voucherId}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Parse ledger entries into from/to entries
          const fromEntries: ContraEntry[] = [];
          const toEntries: ContraEntry[] = [];

          result.data.ledgerEntries.forEach((entry: any) => {
            const contraEntry: ContraEntry = {
              id: entry.id,
              accountId: entry.ledgerAccountId,
              accountName: entry.ledgerReference || "Unknown Account",
              amount: entry.amount,
              description: entry.secondaryDescription || ""
            };

            if (entry.type === "Cr") {
              fromEntries.push(contraEntry);
            } else if (entry.type === "Dr") {
              toEntries.push(contraEntry);
            }
          });

          setVoucherData({
            ...result.data,
            fromEntries,
            toEntries
          });
        } else {
          toast.error(result.error || "Failed to fetch voucher data");
          router.push("/payRecContra/contra");
        }
      } catch (error) {
        console.error('Fetch error:', error);
        toast.error("Failed to fetch voucher data");
        router.push("/payRecContra/contra");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoucherData();
  }, [voucherId, router]);

  const handleEdit = () => {
    router.push(`/PaymentReceiptContra/Contra/edit/${voucherId}`);
  };

  const handlePrint = () => {
    window.print();
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
    return null;
  }

  const totals = {
    from: voucherData.fromEntries.reduce((sum, e) => sum + e.amount, 0),
    to: voucherData.toEntries.reduce((sum, e) => sum + e.amount, 0),
  };

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
              <BreadcrumbLink href="/payRecContra/contra">Contra Vouchers</BreadcrumbLink>
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">View Contra Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {voucherData.voucher.voucherNumber}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="lg">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleEdit} size="lg">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Voucher Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Voucher Number</Label>
                <p className="text-sm font-semibold mt-1">{voucherData.voucher.voucherNumber}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p className="text-sm font-semibold mt-1">{formatDate(voucherData.voucher.date)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <p className="text-sm font-semibold mt-1 capitalize">{voucherData.voucher.voucherType}</p>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Transfer Visual Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* From Accounts Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">From Accounts (Credits)</Label>

                <div className="space-y-2">
                  {voucherData.fromEntries.map((entry) => (
                    <div key={entry.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Account</p>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={() => {}}
                            placeholder="Select From Account"
                            groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                            showGroupName={true}
                            editable={false}
                          />
                        </div>
                        {entry.description && (
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{entry.description}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="text-lg font-bold text-blue-700">{formatAmount(entry.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* From Total */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-muted-foreground mb-1">Total From (Credits)</p>
                  <p className="text-lg font-bold text-blue-700">{formatAmount(totals.from)}</p>
                </div>
              </div>

              {/* Mobile Arrow */}
              <div className="lg:hidden flex items-center justify-center py-2">
                <div className="bg-white rounded-full p-2 shadow-md border-2 border-primary">
                  <ArrowRight className="h-6 w-6 text-primary rotate-90" />
                </div>
              </div>

              {/* To Accounts Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">To Accounts (Debits)</Label>

                <div className="space-y-2">
                  {voucherData.toEntries.map((entry) => (
                    <div key={entry.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Account</p>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={() => {}}
                            placeholder="Select To Account"
                            groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                            showGroupName={true}
                            editable={false}
                          />
                        </div>
                        {entry.description && (
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{entry.description}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="text-lg font-bold text-green-700">{formatAmount(entry.amount)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* To Total */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-muted-foreground mb-1">Total To (Debits)</p>
                  <p className="text-lg font-bold text-green-700">{formatAmount(totals.to)}</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Narration */}
            <div className="space-y-2">
              <Label>Narration</Label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm">{voucherData.voucher.description}</p>
              </div>
            </div>

            {/* Notes */}
            {voucherData.voucher.notes && (
              <div className="space-y-2">
                <Label>Notes</Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">{voucherData.voucher.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}