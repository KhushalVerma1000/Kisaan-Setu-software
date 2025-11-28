"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Save,
  ArrowLeft,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datepicker";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hooks";
import LedgerAccountSelect from "@/components/ledgers/LedgerAccountSelectComponent";
import { 
  createJournalVoucherAction, 
  generateVoucherNumberAction 
} from "@/server/features/vouchers/infrastructure/api/actions/voucherActions";

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

export default function AddJournalVoucherPage() {
  const router = useRouter();
  
  // Form state
  const [voucherNumber, setVoucherNumber] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [narration, setNarration] = useState("");
  const [journalType, setJournalType] = useState<'adjustment' | 'correction' | 'transfer' | 'accrual' | 'provision' | 'other'>('other');
  
  const [entries, setEntries] = useState<JournalEntries>({
    debitEntries: [],
    creditEntries: []
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
          voucherType: 'journal',
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
    debit: entries.debitEntries.reduce((sum, e) => sum + e.amount, 0),
    credit: entries.creditEntries.reduce((sum, e) => sum + e.amount, 0),
  };

  const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

  // Add new entry
  const addEntry = useCallback((type: 'debit' | 'credit') => {
    const newEntry: EntryLine = {
      id: `entry-${type}-${Date.now()}-${Math.random()}`,
      accountId: "",
      accountName: "",
      amount: 0,
    };
    
    setEntries(prev => ({
      ...prev,
      [type === 'debit' ? 'debitEntries' : 'creditEntries']: [
        ...prev[type === 'debit' ? 'debitEntries' : 'creditEntries'],
        newEntry
      ]
    }));
  }, []);

  // Update entry
  const updateEntry = useCallback((type: 'debit' | 'credit', id: string, field: keyof EntryLine, value: any) => {
    setEntries(prev => {
      const key = type === 'debit' ? 'debitEntries' : 'creditEntries';
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
  const removeEntry = useCallback((type: 'debit' | 'credit', id: string) => {
    setEntries(prev => {
      const key = type === 'debit' ? 'debitEntries' : 'creditEntries';
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

    if (entries.debitEntries.length === 0) {
      toast.error("At least one debit entry is required");
      return false;
    }

    if (entries.creditEntries.length === 0) {
      toast.error("At least one credit entry is required");
      return false;
    }

    for (let i = 0; i < entries.debitEntries.length; i++) {
      const entry = entries.debitEntries[i];
      
      if (!entry.accountId) {
        toast.error(`Debit Account ${i + 1} is required`);
        return false;
      }
      
      if (entry.amount <= 0) {
        toast.error(`Debit Amount ${i + 1} must be greater than 0`);
        return false;
      }
    }

    for (let i = 0; i < entries.creditEntries.length; i++) {
      const entry = entries.creditEntries[i];
      
      if (!entry.accountId) {
        toast.error(`Credit Account ${i + 1} is required`);
        return false;
      }
      
      if (entry.amount <= 0) {
        toast.error(`Credit Amount ${i + 1} must be greater than 0`);
        return false;
      }
    }

    if (!isBalanced) {
      toast.error("Total debit amount must equal total credit amount");
      return false;
    }

    return true;
  }, [voucherNumber, date, narration, entries, isBalanced]);

  // Handle form submission using Server Action
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const lineItems = [
        ...entries.debitEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Dr' as const,
          description: entry.accountName || narration
        })),
        ...entries.creditEntries.map(entry => ({
          ledgerAccountId: entry.accountId,
          amount: entry.amount,
          type: 'Cr' as const,
          description: entry.accountName || narration
        }))
      ];

      // Call server action directly from voucherActions
      const response = await createJournalVoucherAction({
        fpoId,
        date: date.toISOString(),
        description: narration,
        notes: `Journal Type: ${journalType}`,
        lineItems,
        createdBy: userId
      });

      if (response.success) {
        toast.success(response.data?.message || "Journal voucher created successfully");
        router.push("/Journal");
      } else {
        toast.error(response.error || "Failed to create journal voucher");
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create journal voucher");
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, date, narration, journalType, fpoId, userId, entries, router]);

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
              <BreadcrumbLink href="/Journal">Accounting</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/Journal">Journal Vouchers</BreadcrumbLink>
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Journal Voucher</h1>
              <p className="text-sm text-muted-foreground mt-1">Create a new journal entry</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="space-y-2">
                <Label>Journal Type</Label>
                <Select value={journalType} onValueChange={(value: any) => setJournalType(value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="accrual">Accrual</SelectItem>
                    <SelectItem value="provision">Provision</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Debit Accounts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Debit Entries <span className="text-red-500">*</span>
                </Label>
                <Button 
                  onClick={() => addEntry('debit')} 
                  variant="outline" 
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {entries.debitEntries.map((entry, index) => (
                  <div key={entry.id} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1.5 sm:hidden">Ledger Account</div>
                      <LedgerAccountSelect
                        value={entry.accountId}
                        onValueChange={(account) => {
                          updateEntry('debit', entry.id, 'accountId', account);
                        }}
                        placeholder="Select Debit Account"
                        showGroupName={true}
                      />
                    </div>
                    <div className="flex gap-2 items-center sm:w-auto w-full">
                      <div className="flex-1 sm:w-32">
                        <div className="text-xs text-muted-foreground mb-1.5 sm:hidden">Amount</div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateEntry('debit', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry('debit', entry.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 sm:mt-0 mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {entries.debitEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <p className="text-sm text-muted-foreground mb-3">No debit entries added</p>
                    <Button onClick={() => addEntry('debit')} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Debit Entry
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Credit Accounts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Credit Entries <span className="text-red-500">*</span>
                </Label>
                <Button 
                  onClick={() => addEntry('credit')} 
                  variant="outline" 
                  size="sm"
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
              
              <div className="space-y-2">
                {entries.creditEntries.map((entry, index) => (
                  <div key={entry.id} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1.5 sm:hidden">Ledger Account</div>
                      <LedgerAccountSelect
                        value={entry.accountId}
                        onValueChange={(account) => {
                          updateEntry('credit', entry.id, 'accountId', account);
                        }}
                        placeholder="Select Credit Account"
                        showGroupName={true}
                      />
                    </div>
                    <div className="flex gap-2 items-center sm:w-auto w-full">
                      <div className="flex-1 sm:w-32">
                        <div className="text-xs text-muted-foreground mb-1.5 sm:hidden">Amount</div>
                        <Input
                          type="number"
                          value={entry.amount || ''}
                          onChange={(e) => updateEntry('credit', entry.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min="0"
                          step="0.01"
                          className="w-full"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry('credit', entry.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 sm:mt-0 mt-6"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {entries.creditEntries.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg bg-gray-50/50">
                    <p className="text-sm text-muted-foreground mb-3">No credit entries added</p>
                    <Button onClick={() => addEntry('credit')} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Credit Entry
                    </Button>
                  </div>
                )}
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
                placeholder="Enter description for this journal entry"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Debit</p>
                <p className="text-xl font-bold">{formatAmount(totals.debit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Credit</p>
                <p className="text-xl font-bold">{formatAmount(totals.credit)}</p>
              </div>
            </div>

            {!isBalanced && entries.debitEntries.length > 0 && entries.creditEntries.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Entries are not balanced. Difference: {formatAmount(Math.abs(totals.debit - totals.credit))}
                </p>
              </div>
            )}

            {isBalanced && entries.debitEntries.length > 0 && entries.creditEntries.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Entries are balanced
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}