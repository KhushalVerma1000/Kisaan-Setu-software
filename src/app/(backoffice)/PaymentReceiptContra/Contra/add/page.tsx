"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Save,
  ArrowLeft,
  X,
  ArrowRight
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
import { createContraVoucherAction, generateVoucherNumberAction } from "@/server/features/vouchers/infrastructure/api/actions/voucherActions";

interface ContraEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
}

interface ContraEntries {
  fromEntries: ContraEntry[];
  toEntries: ContraEntry[];
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

export default function AddContraVoucherPage() {
  const router = useRouter();

  // Form state
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");

  const [entries, setEntries] = useState<ContraEntries>({
    fromEntries: [],
    toEntries: []
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
          voucherType: 'contra',
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

  // Calculate totals
  const totals = {
    from: entries.fromEntries.reduce((sum, e) => sum + e.amount, 0),
    to: entries.toEntries.reduce((sum, e) => sum + e.amount, 0),
  };

  const isBalanced = Math.abs(totals.from - totals.to) < 0.01;

  // Add new entry
  const addEntry = useCallback((type: 'from' | 'to') => {
    const newEntry: ContraEntry = {
      id: `entry-${type}-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
    };

    setEntries(prev => ({
      ...prev,
      [type === 'from' ? 'fromEntries' : 'toEntries']: [
        ...prev[type === 'from' ? 'fromEntries' : 'toEntries'],
        newEntry
      ]
    }));
  }, []);

  // Update entry
  const updateEntry = useCallback((type: 'from' | 'to', id: string, field: keyof ContraEntry, value: any) => {
    setEntries(prev => {
      const key = type === 'from' ? 'fromEntries' : 'toEntries';
      return {
        ...prev,
        [key]: prev[key].map(entry => {
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
      };
    });
  }, []);

  // Remove entry
  const removeEntry = useCallback((type: 'from' | 'to', id: string) => {
    setEntries(prev => {
      const key = type === 'from' ? 'fromEntries' : 'toEntries';
      return {
        ...prev,
        [key]: prev[key].filter(entry => entry.id !== id)
      };
    });
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

    if (entries.fromEntries.length === 0) {
      toast.error("At least one 'from' account is required");
      return false;
    }

    if (entries.toEntries.length === 0) {
      toast.error("At least one 'to' account is required");
      return false;
    }

    for (let i = 0; i < entries.fromEntries.length; i++) {
      const entry = entries.fromEntries[i];

      if (!entry.accountId) {
        toast.error(`From Account ${i + 1} is required`);
        return false;
      }

      if (entry.amount <= 0) {
        toast.error(`From Amount ${i + 1} must be greater than 0`);
        return false;
      }
    }

    for (let i = 0; i < entries.toEntries.length; i++) {
      const entry = entries.toEntries[i];

      if (!entry.accountId) {
        toast.error(`To Account ${i + 1} is required`);
        return false;
      }

      if (entry.amount <= 0) {
        toast.error(`To Amount ${i + 1} must be greater than 0`);
        return false;
      }
    }

    // Check for duplicate accounts
    const allAccountIds = [
      ...entries.fromEntries.map(e => e.accountId),
      ...entries.toEntries.map(e => e.accountId)
    ].filter(Boolean);

    const uniqueAccountIds = new Set(allAccountIds);
    if (allAccountIds.length !== uniqueAccountIds.size) {
      toast.error("Cannot use the same account multiple times in a contra voucher");
      return false;
    }

    if (!isBalanced) {
      toast.error("Total from amount must equal total to amount");
      return false;
    }

    return true;
  }, [voucherNumber, date, narration, entries, isBalanced]);

  // Handle form submission using multi-entry format
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Build line items for multi-entry contra voucher
      const lineItems = [
        // Add all "To" entries as Debits (receiving accounts)
        ...entries.toEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Dr' as const,
          description: `Transfer to ${entry.accountName}`
        })),
        // Add all "From" entries as Credits (source accounts)
        ...entries.fromEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Cr' as const,
          description: `Transfer from ${entry.accountName}`
        }))
      ];

      const response = await createContraVoucherAction({
        fpoId,
        date: date.toISOString(),
        description: narration,
        notes: `Contra transfer between cash/bank accounts`,
        lineItems,
        createdBy: userId
      });

      if (response.success) {
        toast.success(response.data?.message || "Contra voucher created successfully");
        router.push("/PaymentReceiptContra");
      } else {
        toast.error(response.error || "Failed to create contra voucher");
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create contra voucher");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, date, narration, fpoId, userId, entries, router]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-4 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb */}
        {/* <Breadcrumb>
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Contra Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">Transfer between cash/bank accounts (Multi-Entry Supported)</p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isBalanced || !fpoId}
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

            {/* Transfer Visual Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* From Accounts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    From Accounts (Credits) <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    onClick={() => addEntry('from')}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {entries.fromEntries.map((entry, index) => (
                    <div key={entry.id} className="flex flex-col gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1.5">Cash/Bank Account</div>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={(account) => {
                              updateEntry('from', entry.id, 'accountId', account);
                            }}
                            placeholder="Select From Account"
                            groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                            showGroupName={true}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry('from', entry.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 mt-5"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-full">
                        <div className="text-xs text-muted-foreground mb-1.5">Amount</div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateEntry('from', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                      </div>
                    </div>
                  ))}

                  {entries.fromEntries.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                      <p className="text-sm text-muted-foreground mb-3">No from accounts added</p>
                      <Button onClick={() => addEntry('from')} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add From Account
                      </Button>
                    </div>
                  )}
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
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    To Accounts (Debits) <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    onClick={() => addEntry('to')}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {entries.toEntries.map((entry, index) => (
                    <div key={entry.id} className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1.5">Cash/Bank Account</div>
                          <LedgerAccountSelect
                            value={entry.accountId}
                            onValueChange={(account) => {
                              updateEntry('to', entry.id, 'accountId', account);
                            }}
                            placeholder="Select To Account"
                            groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}

                            showGroupName={true}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEntry('to', entry.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 mt-5"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-full">
                        <div className="text-xs text-muted-foreground mb-1.5">Amount</div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateEntry('to', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                      </div>
                    </div>
                  ))}

                  {entries.toEntries.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                      <p className="text-sm text-muted-foreground mb-3">No to accounts added</p>
                      <Button onClick={() => addEntry('to')} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add To Account
                      </Button>
                    </div>
                  )}
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
              <Label htmlFor="narration">
                Narration <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="narration"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Enter description for this transfer"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Balance Status */}
            {!isBalanced && entries.fromEntries.length > 0 && entries.toEntries.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Transfer amounts are not balanced. Difference: {formatAmount(Math.abs(totals.from - totals.to))}
                </p>
              </div>
            )}

            {isBalanced && entries.fromEntries.length > 0 && entries.toEntries.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Transfer amounts are balanced
                </p>
              </div>
            )}

            {/* Multi-entry info */}
            {(entries.fromEntries.length > 1 || entries.toEntries.length > 1) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Multi-entry contra voucher: You can transfer from multiple accounts to multiple accounts in a single voucher.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}