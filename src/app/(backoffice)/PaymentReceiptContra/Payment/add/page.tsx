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
import { createPaymentVoucherAction, generateVoucherNumberAction } from "@/server/features/vouchers/infrastructure/api/actions/voucherActions";

interface PaymentEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
}

interface PaymentData {
  cashBankAccount: {
    id: string;
    name: string;
  };
  paymentEntries: PaymentEntry[];
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

export default function AddPaymentVoucherPage() {
  const router = useRouter();

  // Form state
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");

  const [paymentData, setPaymentData] = useState<PaymentData>({
    cashBankAccount: { id: "", name: "" },
    paymentEntries: []
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
          voucherType: 'payment',
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

  // Calculate total payment amount
  const totalAmount = paymentData.paymentEntries.reduce((sum, e) => sum + e.amount, 0);

  // Add new payment entry
  const addPaymentEntry = useCallback(() => {
    const newEntry: PaymentEntry = {
      id: `entry-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
      description: ""
    };

    setPaymentData(prev => ({
      ...prev,
      paymentEntries: [...prev.paymentEntries, newEntry]
    }));
  }, []);

  // Update payment entry
  const updatePaymentEntry = useCallback((id: string, field: keyof PaymentEntry, value: any) => {
    setPaymentData(prev => ({
      ...prev,
      paymentEntries: prev.paymentEntries.map(entry => {
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

  // Remove payment entry
  const removePaymentEntry = useCallback((id: string) => {
    setPaymentData(prev => ({
      ...prev,
      paymentEntries: prev.paymentEntries.filter(entry => entry.id !== id)
    }));
  }, []);

  // Update cash/bank account
  const updateCashBankAccount = useCallback((account: any) => {
    setPaymentData(prev => ({
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

    if (!paymentData.cashBankAccount.id) {
      toast.error("Cash/Bank account is required");
      return false;
    }

    if (paymentData.paymentEntries.length === 0) {
      toast.error("At least one payment entry is required");
      return false;
    }

    for (let i = 0; i < paymentData.paymentEntries.length; i++) {
      const entry = paymentData.paymentEntries[i];

      if (!entry.accountId) {
        toast.error(`Payment Account ${i + 1} is required`);
        return false;
      }

      if (entry.amount <= 0) {
        toast.error(`Payment Amount ${i + 1} must be greater than 0`);
        return false;
      }

      if (!entry.description.trim()) {
        toast.error(`Description for Payment ${i + 1} is required`);
        return false;
      }
    }

    // Check for duplicate accounts
    const allAccountIds = [
      paymentData.cashBankAccount.id,
      ...paymentData.paymentEntries.map(e => e.accountId)
    ].filter(Boolean);

    const uniqueAccountIds = new Set(allAccountIds);
    if (allAccountIds.length !== uniqueAccountIds.size) {
      toast.error("Cannot use the same account multiple times in a payment voucher");
      return false;
    }

    if (totalAmount <= 0) {
      toast.error("Total payment amount must be greater than 0");
      return false;
    }

    return true;
  }, [voucherNumber, date, narration, paymentData, totalAmount]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Build line items for payment voucher
      const lineItems = [
        // Credit entry: Cash/Bank account (money going out)
        {
          ledgerAccountId: paymentData.cashBankAccount.id,
          amount: totalAmount,
          type: 'Cr' as const,
          description: `Payment from ${paymentData.cashBankAccount.name}`
        },
        // Debit entries: Expense/Liability accounts (receiving the payment)
        ...paymentData.paymentEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Dr' as const,
          description: entry.description
        }))
      ];

      const response = await createPaymentVoucherAction({
        fpoId,
        date: date.toISOString(),
        description: narration,
        notes: `Payment voucher with ${paymentData.paymentEntries.length} entries`,
        lineItems,
        createdBy: userId
      });

      if (response.success) {
        toast.success(response.data?.message || "Payment voucher created successfully");
        router.push("/PaymentReceiptContra");
      } else {
        toast.error(response.error || "Failed to create payment voucher");
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment voucher");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, date, narration, fpoId, userId, paymentData, totalAmount, router]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        {/* <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/Dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/PaymentReceiptContra">Accounting</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/PaymentReceiptContra">Payment Vouchers</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Add New</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb> */}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Payment Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">Record payments made from cash/bank accounts</p>
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
                Pay From (Cash/Bank Account) <span className="text-red-500">*</span>
              </Label>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-1.5">Select Account</div>
                  <LedgerAccountSelect
                    value={paymentData.cashBankAccount.id}
                    onValueChange={updateCashBankAccount}
                    placeholder="Select Cash/Bank Account"
                    groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}

                    showGroupName={true}
                  />
                </div>
                {paymentData.cashBankAccount.id && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-muted-foreground mb-1">Total Payment Amount</p>
                    <p className="text-xl font-bold text-red-700">{formatAmount(totalAmount)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Payment Entries Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Pay To (Expense/Liability Accounts) <span className="text-red-500">*</span>
                </Label>
                <Button
                  onClick={addPaymentEntry}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Entry
                </Button>
              </div>

              <div className="space-y-2">
                {paymentData.paymentEntries.map((entry, index) => (
                  <div key={entry.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="space-y-3">
                      {/* Account Selection */}
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1.5">Account</div>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={(account) => {
                              updatePaymentEntry(entry.id, 'accountId', account);
                            }}
                            placeholder="Select Expense/Liability Account"
                            showGroupName={true}
                            groupNames={[
                              "Sundry Creditors",
                              "Direct Expenses",
                              "Indirect Expenses",
                              "Loans (Liability)",
                              "Fixed Assets",
                              "Drawings",
                              "Duties & Taxes",
                              "Purchase Accounts"
                            ]}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePaymentEntry(entry.id)}
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
                            onChange={(e) => updatePaymentEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
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
                            onChange={(e) => updatePaymentEntry(entry.id, 'description', e.target.value)}
                            placeholder="Payment description"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {paymentData.paymentEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <Minus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No payment entries added</p>
                    <Button onClick={addPaymentEntry} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment Entry
                    </Button>
                  </div>
                )}
              </div>

              {/* Total Display */}
              {paymentData.paymentEntries.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-900">Total Payment Amount:</span>
                    <span className="text-lg font-bold text-green-700">{formatAmount(totalAmount)}</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {paymentData.paymentEntries.length} {paymentData.paymentEntries.length === 1 ? 'entry' : 'entries'}
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
                placeholder="Enter description for this payment"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Multi-entry info */}
            {paymentData.paymentEntries.length > 1 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Multi-entry payment voucher: Making payments to multiple accounts in a single transaction.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}