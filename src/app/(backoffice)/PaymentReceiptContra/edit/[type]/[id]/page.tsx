"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Plus,
  Save,
  ArrowLeft,
  X,
  Minus,
  ArrowRight,
  Loader2
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
import { 
  getVoucherDetailsAction,
  createPaymentVoucherAction,
  createReceiptVoucherAction,
  createContraVoucherAction,
  deleteVoucherAction
} from "@/server/features/vouchers/infrastructure/api/actions/voucherActions";

type VoucherType = 'payment' | 'receipt' | 'contra';

interface VoucherEntry {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  description: string;
}

interface PaymentReceiptData {
  cashBankAccount: {
    id: string;
    name: string;
  };
  entries: VoucherEntry[];
}

interface ContraData {
  fromEntries: VoucherEntry[];
  toEntries: VoucherEntry[];
}

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const getVoucherConfig = (type: VoucherType) => {
  const configs = {
    payment: {
      title: "Edit Payment Voucher",
      description: "Update payment details",
      cashBankLabel: "Pay From (Cash/Bank Account)",
      cashBankColor: "red",
      entriesLabel: "Pay To (Expense/Liability Accounts)",
      entriesColor: "green",
      entryPlaceholder: "Select Expense/Liability Account",
      groupNames: [
        "Sundry Creditors",
        "Direct Expenses",
        "Indirect Expenses",
        "Loans (Liability)",
        "Fixed Assets",
        "Drawings",
        "Duties & Taxes",
        "Purchase Accounts"
      ],
      breadcrumb: "Payment Vouchers",
      breadcrumbPath: "/payRecContra/payment"
    },
    receipt: {
      title: "Edit Receipt Voucher",
      description: "Update receipt details",
      cashBankLabel: "Receive Into (Cash/Bank Account)",
      cashBankColor: "green",
      entriesLabel: "Receive From (Income/Asset Accounts)",
      entriesColor: "blue",
      entryPlaceholder: "Select Income/Asset Account",
      groupNames: [
        "Sundry Debtors",
        "Current Liabilities",
        "Capital Account",
        "Direct Incomes",
        "Indirect Incomes",
        "Sales Accounts",
        "Loans (Liability)",
        "Duties & Taxes"
      ],
      breadcrumb: "Receipt Vouchers",
      breadcrumbPath: "/payRecContra/receipt"
    },
    contra: {
      title: "Edit Contra Voucher",
      description: "Update transfer details",
      cashBankLabel: "Transfer Between Cash/Bank Accounts",
      cashBankColor: "blue",
      entriesLabel: "Transfer Accounts",
      entriesColor: "green",
      entryPlaceholder: "Select Cash/Bank Account",
      groupNames: ["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"],
      breadcrumb: "Contra Vouchers",
      breadcrumbPath: "/payRecContra/contra"
    }
  };
  return configs[type];
};

export default function EditVoucherPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params.id as string;
  const voucherType = params.type as VoucherType;

  const [isLoading, setIsLoading] = useState(true);
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data for payment/receipt vouchers
  const [paymentReceiptData, setPaymentReceiptData] = useState<PaymentReceiptData>({
    cashBankAccount: { id: "", name: "" },
    entries: []
  });

  // Data for contra vouchers
  const [contraData, setContraData] = useState<ContraData>({
    fromEntries: [],
    toEntries: []
  });

  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId || "";
  const userId = user.fpoId || "";

  const config = getVoucherConfig(voucherType);

  // Load voucher data
  useEffect(() => {
    const loadVoucher = async () => {
      if (!voucherId) return;

      setIsLoading(true);
      try {
        const response = await getVoucherDetailsAction(voucherId);

        if (!response.success || !response.data) {
          toast.error("Failed to load voucher");
          router.back();
          return;
        }

        const voucher = response.data.voucher;
        const lineItems = response.data.lineItems || [];

        setVoucherNumber(voucher.voucherNumber);
        setDate(new Date(voucher.date));
        setNarration(voucher.description);

        if (voucherType === 'contra') {
          // Parse contra voucher
          const fromEntries = lineItems
            .filter((item: any) => item.type === 'Cr')
            .map((item: any, index: number) => ({
              id: `from-${index}`,
              accountId: item.ledgerAccountId,
              accountName: item.ledgerAccount?.name || '',
              amount: item.amount,
              description: item.description
            }));

          const toEntries = lineItems
            .filter((item: any) => item.type === 'Dr')
            .map((item: any, index: number) => ({
              id: `to-${index}`,
              accountId: item.ledgerAccountId,
              accountName: item.ledgerAccount?.name || '',
              amount: item.amount,
              description: item.description
            }));

          setContraData({ fromEntries, toEntries });
        } else {
          // Parse payment/receipt voucher
          const creditType = voucherType === 'payment' ? 'Cr' : 'Dr';
          const debitType = voucherType === 'payment' ? 'Dr' : 'Cr';

          const cashBankItem = lineItems.find((item: any) => item.type === creditType);
          const entries = lineItems
            .filter((item: any) => item.type === debitType)
            .map((item: any, index: number) => ({
              id: `entry-${index}`,
              accountId: item.ledgerAccountId,
              accountName: item.ledgerAccount?.name || '',
              amount: item.amount,
              description: item.description
            }));

          setPaymentReceiptData({
            cashBankAccount: {
              id: cashBankItem?.ledgerAccountId || '',
              name: cashBankItem?.ledgerAccount?.name || ''
            },
            entries
          });
        }
      } catch (error) {
        toast.error("Failed to load voucher");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadVoucher();
  }, [voucherId, voucherType, router]);

  // Calculate totals
  const getTotals = () => {
    if (voucherType === 'contra') {
      return {
        from: contraData.fromEntries.reduce((sum, e) => sum + e.amount, 0),
        to: contraData.toEntries.reduce((sum, e) => sum + e.amount, 0)
      };
    } else {
      const total = paymentReceiptData.entries.reduce((sum, e) => sum + e.amount, 0);
      return { total };
    }
  };

  const totals = getTotals();
  const isBalanced = voucherType === 'contra' 
    ? Math.abs((totals as any).from - (totals as any).to) < 0.01 
    : true;

  // Entry management for payment/receipt
  const addEntry = useCallback(() => {
    const newEntry: VoucherEntry = {
      id: `entry-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
      description: ""
    };

    setPaymentReceiptData(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));
  }, []);

  const updateEntry = useCallback((id: string, field: keyof VoucherEntry, value: any) => {
    setPaymentReceiptData(prev => ({
      ...prev,
      entries: prev.entries.map(entry => {
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

  const removeEntry = useCallback((id: string) => {
    setPaymentReceiptData(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.id !== id)
    }));
  }, []);

  const updateCashBankAccount = useCallback((account: any) => {
    setPaymentReceiptData(prev => ({
      ...prev,
      cashBankAccount: {
        id: account?.id || '',
        name: account?.name || ''
      }
    }));
  }, []);

  // Entry management for contra
  const addContraEntry = useCallback((type: 'from' | 'to') => {
    const newEntry: VoucherEntry = {
      id: `entry-${type}-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
      description: ""
    };

    setContraData(prev => ({
      ...prev,
      [type === 'from' ? 'fromEntries' : 'toEntries']: [
        ...prev[type === 'from' ? 'fromEntries' : 'toEntries'],
        newEntry
      ]
    }));
  }, []);

  const updateContraEntry = useCallback((type: 'from' | 'to', id: string, field: keyof VoucherEntry, value: any) => {
    setContraData(prev => {
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

  const removeContraEntry = useCallback((type: 'from' | 'to', id: string) => {
    setContraData(prev => {
      const key = type === 'from' ? 'fromEntries' : 'toEntries';
      return {
        ...prev,
        [key]: prev[key].filter(entry => entry.id !== id)
      };
    });
  }, []);

  // Validation
  const validateForm = useCallback(() => {
    if (!voucherNumber.trim()) {
      toast.error("Voucher number is required");
      return false;
    }

    if (!narration.trim()) {
      toast.error("Narration is required");
      return false;
    }

    if (voucherType === 'contra') {
      if (contraData.fromEntries.length === 0 || contraData.toEntries.length === 0) {
        toast.error("Both from and to entries are required");
        return false;
      }

      for (const entry of [...contraData.fromEntries, ...contraData.toEntries]) {
        if (!entry.accountId || entry.amount <= 0) {
          toast.error("All entries must have an account and amount greater than 0");
          return false;
        }
      }

      if (!isBalanced) {
        toast.error("Total from amount must equal total to amount");
        return false;
      }
    } else {
      if (!paymentReceiptData.cashBankAccount.id) {
        toast.error("Cash/Bank account is required");
        return false;
      }

      if (paymentReceiptData.entries.length === 0) {
        toast.error("At least one entry is required");
        return false;
      }

      for (const entry of paymentReceiptData.entries) {
        if (!entry.accountId || entry.amount <= 0 || !entry.description.trim()) {
          toast.error("All entries must have account, amount, and description");
          return false;
        }
      }
    }

    return true;
  }, [voucherNumber, narration, voucherType, paymentReceiptData, contraData, isBalanced]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Delete old voucher
      const deleteResponse = await deleteVoucherAction(voucherId);
      if (!deleteResponse.success) {
        toast.error("Failed to delete old voucher");
        return;
      }

      // Create new voucher with updated data
      let lineItems;
      let response;

      if (voucherType === 'contra') {
        lineItems = [
          ...contraData.toEntries.map(entry => ({
            ledgerAccountId: entry.accountId,
            amount: entry.amount,
            type: 'Dr' as const,
            description: `Transfer to ${entry.accountName}`
          })),
          ...contraData.fromEntries.map(entry => ({
            ledgerAccountId: entry.accountId,
            amount: entry.amount,
            type: 'Cr' as const,
            description: `Transfer from ${entry.accountName}`
          }))
        ];

        response = await createContraVoucherAction({
          fpoId,
          date: date.toISOString(),
          description: narration,
          notes: `Updated contra voucher`,
          lineItems,
          createdBy: userId
        });
      } else {
        const totalAmount = paymentReceiptData.entries.reduce((sum, e) => sum + e.amount, 0);

        if (voucherType === 'payment') {
          lineItems = [
            {
              ledgerAccountId: paymentReceiptData.cashBankAccount.id,
              amount: totalAmount,
              type: 'Cr' as const,
              description: `Payment from ${paymentReceiptData.cashBankAccount.name}`
            },
            ...paymentReceiptData.entries.map(entry => ({
              ledgerAccountId: entry.accountId,
              amount: entry.amount,
              type: 'Dr' as const,
              description: entry.description
            }))
          ];

          response = await createPaymentVoucherAction({
            fpoId,
            date: date.toISOString(),
            description: narration,
            notes: `Updated payment voucher`,
            lineItems,
            createdBy: userId
          });
        } else {
          lineItems = [
            {
              ledgerAccountId: paymentReceiptData.cashBankAccount.id,
              amount: totalAmount,
              type: 'Dr' as const,
              description: `Receipt into ${paymentReceiptData.cashBankAccount.name}`
            },
            ...paymentReceiptData.entries.map(entry => ({
              ledgerAccountId: entry.accountId,
              amount: entry.amount,
              type: 'Cr' as const,
              description: entry.description
            }))
          ];

          response = await createReceiptVoucherAction({
            fpoId,
            date: date.toISOString(),
            description: narration,
            notes: `Updated receipt voucher`,
            lineItems,
            createdBy: userId
          });
        }
      }

      if (response.success) {
        toast.success("Voucher updated successfully");
        router.push(config.breadcrumbPath);
      } else {
        toast.error(response.error || "Failed to update voucher");
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error("Failed to update voucher");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, voucherId, voucherType, date, narration, fpoId, userId, paymentReceiptData, contraData, router, config]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading voucher...</p>
        </div>
      </div>
    );
  }

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
              <BreadcrumbLink href={config.breadcrumbPath}>{config.breadcrumb}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{config.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (voucherType === 'contra' && !isBalanced)}
            size="lg"
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Voucher"}
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
                  className="h-10"
                />
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Contra-specific layout */}
            {voucherType === 'contra' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* From Accounts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      From Accounts (Credits) <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      onClick={() => addContraEntry('from')}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {contraData.fromEntries.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <LedgerAccountSelect
                              value={entry.accountId}
                              onValueChange={(account) => updateContraEntry('from', entry.id, 'accountId', account)}
                              placeholder="Select From Account"
                              groupNames={config.groupNames}
                              showGroupName={true}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeContraEntry('from', entry.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateContraEntry('from', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-muted-foreground mb-1">Total From</p>
                    <p className="text-lg font-bold text-blue-700">{formatAmount((totals as any).from)}</p>
                  </div>
                </div>

                {/* To Accounts */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      To Accounts (Debits) <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      onClick={() => addContraEntry('to')}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {contraData.toEntries.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <LedgerAccountSelect
                              value={entry.accountId}
                              onValueChange={(account) => updateContraEntry('to', entry.id, 'accountId', account)}
                              placeholder="Select To Account"
                              groupNames={config.groupNames}
                              showGroupName={true}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeContraEntry('to', entry.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateContraEntry('to', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-muted-foreground mb-1">Total To</p>
                    <p className="text-lg font-bold text-green-700">{formatAmount((totals as any).to)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment/Receipt layout */}
            {voucherType !== 'contra' && (
              <>
                {/* Cash/Bank Account */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {config.cashBankLabel} <span className="text-red-500">*</span>
                  </Label>
                  <div className={`p-4 bg-${config.cashBankColor}-50 rounded-lg border border-${config.cashBankColor}-200`}>
                    <LedgerAccountSelect
                      value={paymentReceiptData.cashBankAccount.id}
                      onValueChange={updateCashBankAccount}
                      placeholder="Select Cash/Bank Account"
                      groupNames={["Cash-in-Hand", "Bank Accounts", "Bank OD A/c"]}
                      showGroupName={true}
                    />
                    {paymentReceiptData.cashBankAccount.id && (
                      <div className={`mt-3 pt-3 border-t border-${config.cashBankColor}-200`}>
                        <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                        <p className={`text-xl font-bold text-${config.cashBankColor}-700`}>
                          {formatAmount((totals as any).total)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Entries */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      {config.entriesLabel} <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      onClick={addEntry}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Entry
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {paymentReceiptData.entries.map((entry) => (
                      <div key={entry.id} className={`p-4 bg-${config.entriesColor}-50 rounded-lg border border-${config.entriesColor}-200`}>
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <LedgerAccountSelect
                                value={entry.accountId}
                                onValueChange={(account) => updateEntry(entry.id, 'accountId', account)}
                                placeholder={config.entryPlaceholder}
                                groupNames={config.groupNames}
                                showGroupName={true}
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEntry(entry.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              type="number"
                              value={entry.amount || ''}
                              onChange={(e) => updateEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="Amount"
                              min="0"
                              step="0.01"
                            />
                            <Input
                              type="text"
                              value={entry.description}
                              onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                              placeholder="Description"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-border" />

            {/* Narration */}
            <div className="space-y-2">
              <Label htmlFor="narration">
                Narration <span className="text-red-500">*</span>
              </Label>
              </div>
              {/* Balance Status for Contra */}
        {voucherType === 'contra' && !isBalanced && contraData.fromEntries.length > 0 && contraData.toEntries.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Transfer amounts are not balanced. Difference: {formatAmount(Math.abs((totals as any).from - (totals as any).to))}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
</div>
  );
}   