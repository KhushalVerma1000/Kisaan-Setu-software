"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  ArrowLeft,
  X,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DatePicker } from "@/components/ui/datepicker";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hooks";
import LedgerAccountSelect from "@/components/ledgers/LedgerAccountSelectComponent";
import { createReceiptVoucherAction, generateVoucherNumberAction } from "@/server/features/vouchers/infrastructure/api/actions/voucherActions";

interface ReceiptEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
}

interface ReceiptData {
  cashBankAccount: {
    id: string;
    name: string;
  };
  receiptEntries: ReceiptEntry[];
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

export default function AddReceiptVoucherPage() {
  const router = useRouter();

  // Form state
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");

  const [receiptData, setReceiptData] = useState<ReceiptData>({
    cashBankAccount: { id: "", name: "" },
    receiptEntries: []
  });

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);

  // Get current FPO ID and User ID
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId || "";
  const userId = user.fpoId || "";

  // Generate voucher number on component mount and date change
  useEffect(() => {
    const generateVoucherNumber = async () => {
      if (!fpoId) return;

      setIsGeneratingNumber(true);
      try {
        const result = await generateVoucherNumberAction({
          fpoId,
          voucherType: 'receipt',
          date: date.toISOString()
        });

        if (result.success && result.data) {
          setVoucherNumber(result.data.voucherNumber);
        } else {
          toast.error(result.error || "Failed to generate voucher number");
        }
      } catch (error) {
        toast.error("Failed to generate voucher number");
      } finally {
        setIsGeneratingNumber(false);
      }
    };

    generateVoucherNumber();
  }, [date, fpoId]);

  // Calculate total receipt amount
  const totalAmount = receiptData.receiptEntries.reduce((sum, e) => sum + e.amount, 0);

  // Add new receipt entry
  const addReceiptEntry = useCallback(() => {
    const newEntry: ReceiptEntry = {
      id: `entry-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
      description: ""
    };

    setReceiptData(prev => ({
      ...prev,
      receiptEntries: [...prev.receiptEntries, newEntry]
    }));
  }, []);

  // Update receipt entry
  const updateReceiptEntry = useCallback((id: string, field: keyof ReceiptEntry, value: any) => {
    setReceiptData(prev => ({
      ...prev,
      receiptEntries: prev.receiptEntries.map(entry => {
        if (entry.id !== id) return entry;

        if (field === 'accountId' && typeof value === 'object') {
          return {
            ...entry,
            accountId: value?.id || '',
            accountName: value?.name || ''
          };
        }

        return { ...entry, [field]: value };
      })
    }));
  }, []);

  // Remove receipt entry
  const removeReceiptEntry = useCallback((id: string) => {
    setReceiptData(prev => ({
      ...prev,
      receiptEntries: prev.receiptEntries.filter(entry => entry.id !== id)
    }));
  }, []);

  // Update cash/bank account
  const updateCashBankAccount = useCallback((account: any) => {
    setReceiptData(prev => ({
      ...prev,
      cashBankAccount: {
        id: account?.id || '',
        name: account?.name || ''
      }
    }));
  }, []);

  // Validate form
  const validateForm = useCallback(() => {
    if (!voucherNumber.trim()) {
      toast.error("Voucher number is required");
      return false;
    }

    if (!date || isNaN(date.getTime())) {
      toast.error("Please select a valid date");
      return false;
    }

    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      toast.error("Please select a date between 1900 and 2100");
      return false;
    }

    if (!narration.trim()) {
      toast.error("Narration is required");
      return false;
    }

    if (!receiptData.cashBankAccount.id) {
      toast.error("Cash/Bank account is required");
      return false;
    }

    if (receiptData.receiptEntries.length === 0) {
      toast.error("At least one receipt entry is required");
      return false;
    }

    for (let i = 0; i < receiptData.receiptEntries.length; i++) {
      const entry = receiptData.receiptEntries[i];

      if (!entry.accountId) {
        toast.error(`Receipt Account ${i + 1} is required`);
        return false;
      }

      if (entry.amount <= 0) {
        toast.error(`Receipt Amount ${i + 1} must be greater than 0`);
        return false;
      }

      if (!entry.description.trim()) {
        toast.error(`Description for Receipt ${i + 1} is required`);
        return false;
      }
    }

    // Check for duplicate accounts
    const allAccountIds = [
      receiptData.cashBankAccount.id,
      ...receiptData.receiptEntries.map(e => e.accountId)
    ].filter(Boolean);

    const uniqueAccountIds = new Set(allAccountIds);
    if (allAccountIds.length !== uniqueAccountIds.size) {
      toast.error("Cannot use the same account multiple times in a receipt voucher");
      return false;
    }

    if (totalAmount <= 0) {
      toast.error("Total receipt amount must be greater than 0");
      return false;
    }

    return true;
  }, [voucherNumber, date, narration, receiptData, totalAmount]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Build line items for receipt voucher
      const lineItems = [
        // Debit entry: Cash/Bank account (money coming in)
        {
          ledgerAccountId: receiptData.cashBankAccount.id,
          amount: totalAmount,
          type: 'Dr' as const,
          description: `Receipt into ${receiptData.cashBankAccount.name}`
        },
        // Credit entries: Income/Asset accounts (source of the receipt)
        ...receiptData.receiptEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Cr' as const,
          description: entry.description
        }))
      ];

      const response = await createReceiptVoucherAction({
        fpoId,
        date: date.toISOString(),
        description: narration,
        notes: `Receipt voucher with ${receiptData.receiptEntries.length} entries`,
        lineItems,
        createdBy: userId
      });

      if (response.success) {
        toast.success(response.data?.message || "Receipt voucher created successfully");
        router.push("/PaymentReceiptContra");
      } else {
        toast.error(response.error || "Failed to create receipt voucher");
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create receipt voucher");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, date, narration, fpoId, userId, receiptData, totalAmount, router]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        <Breadcrumb>
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
            <BreadcrumbPage>Add New</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Receipt Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">Record receipts received into cash/bank accounts</p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || totalAmount === 0 || !fpoId}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Voucher"}
          </Button>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-6">
            {/* Voucher Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                date={date}
                onDateChange={(newDate) => newDate && setDate(newDate)}
                label="Voucher Date"
                placeholder="Select voucher date"
                required={true}
              />

              <div className="space-y-2">
                <Label htmlFor="voucherNumber">
                  Voucher Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="voucherNumber"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  placeholder="Enter voucher number"
                  disabled={isGeneratingNumber}
                  className="h-10"
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Cash/Bank Account Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Receive Into (Cash/Bank Account) <span className="text-red-500">*</span>
              </Label>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-1.5">Select Account</div>
                  <LedgerAccountSelect
                    value={receiptData.cashBankAccount.id}
                    onValueChange={updateCashBankAccount}
                    placeholder="Select Cash/Bank Account"
                    groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                    showGroupName={true}
                  />
                </div>
                {receiptData.cashBankAccount.id && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-xs text-muted-foreground mb-1">Total Receipt Amount</p>
                    <p className="text-xl font-bold text-green-700">{formatAmount(totalAmount)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Receipt Entries Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Receive From (Income/Asset Accounts) <span className="text-red-500">*</span>
                </Label>
                <Button
                  onClick={addReceiptEntry}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-2">
                {receiptData.receiptEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="space-y-3">
                      {/* Account Selection */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1.5">Account</div>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={(account) => {
                              updateReceiptEntry(entry.id, 'accountId', account);
                            }}
                            placeholder="Select Income/Asset Account"
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
                            showGroupName={true}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeReceiptEntry(entry.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 mt-5"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Amount and Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1.5">Amount</div>
                          <Input
                            type="number"
                            value={entry.amount || ''}
                            onChange={(e) => updateReceiptEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1.5">Description</div>
                          <Input
                            type="text"
                            value={entry.description}
                            onChange={(e) => updateReceiptEntry(entry.id, 'description', e.target.value)}
                            placeholder="Receipt description"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {receiptData.receiptEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <Minus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No receipt entries added</p>
                    <Button onClick={addReceiptEntry} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Receipt Entry
                    </Button>
                  </div>
                )}
              </div>

              {/* Total Display */}
              {receiptData.receiptEntries.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Total Receipt Amount:</span>
                    <span className="text-lg font-bold text-blue-700">{formatAmount(totalAmount)}</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {receiptData.receiptEntries.length} {receiptData.receiptEntries.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Narration */}
            <div className="space-y-2">
              <Label htmlFor="narration">
                Narration <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="narration"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Enter description for this receipt"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Multi-entry info */}
            {receiptData.receiptEntries.length > 1 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Multi-entry receipt voucher: Recording receipts from multiple sources in a single transaction.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}