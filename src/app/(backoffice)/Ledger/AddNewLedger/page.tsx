"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save, X, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'react-toastify';
import { useAppSelector } from "@/store/hooks";
import { LedgerGroup, LedgerGroupInterface } from "@/server/features/ledger/core/entities/LedgerGroup";

interface BankDetails {
  accountNumber: string;
  accountHolderName?: string;
  ifscCode: string;
  BankName?: string;
  accountType: 'Regular' | 'OD' | 'CC';
  upiId?: string;
}

interface LedgerFormData {
  name: string;
  groupName: string;
  openingDate: string;
  amount: number;
  amountType: "Cr" | "Dr";
  address: string;
  phoneNumber: string;
  state: string;
  gstNumber: string;
  bankDetails?: BankDetails;
}

interface HierarchicalGroup {
  group: LedgerGroup;
  children: HierarchicalGroup[];
  level: number;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const INDIAN_BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
  "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank of India",
  "IndusInd Bank", "IDBI Bank", "Yes Bank", "Bank of India", "Central Bank of India",
  "Indian Bank", "UCO Bank", "Bank of Maharashtra", "Punjab & Sind Bank",
  "Indian Overseas Bank", "Bandhan Bank", "Federal Bank", "RBL Bank",
  "South Indian Bank", "Karur Vysya Bank", "Tamilnad Mercantile Bank",
  "Dhanlaxmi Bank", "City Union Bank", "IDFC First Bank", "Jammu & Kashmir Bank",
  "DCB Bank", "Other"
];

export default function AddLedgerPage() {
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId;
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>([]);
  const [hierarchicalGroups, setHierarchicalGroups] = useState<HierarchicalGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  
  // Dialog states
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({ 
    group: "", 
    parentGroup: "", 
  });

  const [formData, setFormData] = useState<LedgerFormData>({
    name: "",
    groupName: "",
    openingDate: "",
    amount: 0,
    amountType: "Dr",
    address: "",
    phoneNumber: "",
    state: "",
    gstNumber: "",
    bankDetails: undefined
  });

  // Check if selected group is a bank account group
  const isBankAccountGroup = (groupName: string): boolean => {
    return groupName === "Bank Accounts" || groupName === "Bank OD A/c";
  };

  const buildHierarchy = (groups: LedgerGroup[]): HierarchicalGroup[] => {
    const groupMap = new Map<string, LedgerGroup>();
    groups.forEach(group => {
        groupMap.set(group.group, group);
    });

    const rootGroups = groups.filter(group => 
        !group.parentgroup || group.parentgroup === null || group.parentgroup === undefined
    );

    const buildChildren = (parentGroup: LedgerGroup, level: number = 0): HierarchicalGroup => {
        const children = groups
            .filter(group => group.parentgroup === parentGroup.group)
            .sort((a, b) => a.group.localeCompare(b.group))
            .map(childGroup => buildChildren(childGroup, level + 1));

        return {
            group: parentGroup,
            children: children,
            level: level
        };
    };

    const hierarchy = rootGroups
        .sort((a, b) => a.group.localeCompare(b.group))
        .map(rootGroup => buildChildren(rootGroup, 0));

    return hierarchy;
  };

  const flattenHierarchy = (hierarchical: HierarchicalGroup[]): { group: LedgerGroup; displayName: string }[] => {
    const flattened: { group: LedgerGroup; displayName: string }[] = [];
    
    const flatten = (items: HierarchicalGroup[]) => {
        items.forEach(item => {
            const indent = "  ".repeat(item.level);
            const connector = item.level > 0 ? "├─ " : "";
            const displayName = `${indent}${connector}${item.group.group}`;
            
            flattened.push({
                group: item.group,
                displayName: displayName
            });
            
            if (item.children.length > 0) {
                flatten(item.children);
            }
        });
    };

    flatten(hierarchical);
    return flattened;
  };

  const isGroupNameExists = (groupName: string): boolean => {
    return ledgerGroups.some(group => 
        group.group.toLowerCase() === groupName.toLowerCase()
    );
  };

  const isDefaultGroup = (groupName: string): boolean => {
    return ledgerGroups.some(group => 
        group.group.toLowerCase() === groupName.toLowerCase() && group.isDefault
    );
  };

  // Validate IFSC code
  const validateIFSC = (ifscCode: string): boolean => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifscCode);
  };

  // Get bank name from IFSC code
  const getBankFromIFSC = (ifscCode: string): string | null => {
    if (!validateIFSC(ifscCode)) return null;
    
    const bankCodes: { [key: string]: string } = {
      'SBIN': 'State Bank of India',
      'HDFC': 'HDFC Bank',
      'ICIC': 'ICICI Bank',
      'UTIB': 'Axis Bank',
      'KKBK': 'Kotak Mahindra Bank',
      'PUNB': 'Punjab National Bank',
      'BARB': 'Bank of Baroda',
      'CNRB': 'Canara Bank',
      'UBIN': 'Union Bank of India',
      'INDB': 'IndusInd Bank',
      'IDIB': 'IDBI Bank',
      'YESB': 'Yes Bank',
    };
    
    const bankCode = ifscCode.substring(0, 4);
    return bankCodes[bankCode] || null;
  };

  // Load initial data
  useEffect(() => {
    if (fpoId) {
      loadLedgerGroups();
    }
  }, [fpoId]);

  useEffect(() => {
    if (ledgerGroups.length > 0) {
      const hierarchy = buildHierarchy(ledgerGroups);
      setHierarchicalGroups(hierarchy);
    } else {
      setHierarchicalGroups([]);
    }
  }, [ledgerGroups]);

  // Initialize bank details when bank group is selected
  useEffect(() => {
    if (isBankAccountGroup(formData.groupName)) {
      if (!formData.bankDetails) {
        setFormData(prev => ({
          ...prev,
          bankDetails: {
            accountNumber: "",
            ifscCode: "",
            accountType: "Regular",
          }
        }));
      }
    } else {
      // Remove bank details if group is changed to non-bank
      if (formData.bankDetails) {
        setFormData(prev => ({
          ...prev,
          bankDetails: undefined
        }));
      }
    }
  }, [formData.groupName]);

  const loadLedgerGroups = async () => {
    setLoadingGroups(true);
    try {
        const response = await fetch(`/api/ledger/ledgerGroup?fpo_id=${fpoId}`);
        
        if (response.ok) {
            const allGroups = await response.json();
            
            const ledgerGroupInstances = allGroups.map((group: any) => {
                if (!group.group) {
                    console.error('Invalid group data:', group);
                    return null;
                }
                
                return new LedgerGroup(
                    group.group,
                    group.parentgroup,
                    group.id,
                    group.fpo_id,
                    group.isDefault || false
                );
            }).filter(Boolean);
            
            setLedgerGroups(ledgerGroupInstances);
        } else {
            console.error('Failed to load ledger groups, status:', response.status);
            setLedgerGroups([]);
        }
    } catch (error) {
        console.error('Error loading ledger groups:', error);
        setLedgerGroups([]);
    } finally {
        setLoadingGroups(false);
    }
  };

  const handleInputChange = (field: keyof LedgerFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankDetailsChange = (field: keyof BankDetails, value: any) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails!,
        [field]: value
      }
    }));
  };

  const handleIFSCChange = (ifscCode: string) => {
    const upperIFSC = ifscCode.toUpperCase();
    handleBankDetailsChange('ifscCode', upperIFSC);
    
    // Auto-detect bank name from IFSC
    if (upperIFSC.length === 11) {
      const detectedBank = getBankFromIFSC(upperIFSC);
      if (detectedBank) {
        handleBankDetailsChange('BankName', detectedBank);
        // toast.success(`Detected: ${detectedBank}`);
      }
    }
  };

  const validateBankDetails = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (isBankAccountGroup(formData.groupName) && formData.bankDetails) {
      if (!formData.bankDetails.accountNumber) {
        errors.push('Account number is required');
      }
      if (!formData.bankDetails.ifscCode) {
        errors.push('IFSC code is required');
      } else if (!validateIFSC(formData.bankDetails.ifscCode)) {
        errors.push('Invalid IFSC code format');
      }
      if (!formData.bankDetails.accountType) {
        errors.push('Account type is required');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim()) {
      toast.error("Ledger name is required");
      return;
    }

    if (!formData.groupName) {
      toast.error("Please select a group");
      return;
    }

    if (!fpoId) {
      toast.error("FPO ID is missing");
      return;
    }

    // Bank details validation
    if (isBankAccountGroup(formData.groupName)) {
      const bankValidation = validateBankDetails();
      if (!bankValidation.valid) {
        toast.error(bankValidation.errors[0]);
        return;
      }
    }

    setLoading(true);

    try {
      const requestData = {
        name: formData.name.trim(),
        groupName: formData.groupName,
        amount: Number(formData.amount),
        amountType: formData.amountType,
        address: formData.address.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        fpoId: fpoId,
        openingDate: formData.openingDate || undefined,
        state: formData.state || undefined,
        gstNumber: formData.gstNumber.trim() || undefined,
        bankDetails: formData.bankDetails || undefined,
      };

      console.log('Sending request data:', requestData);

      const response = await fetch('/api/ledger/ledgerAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || `HTTP error! status: ${response.status}`);
      }

      toast.success(result.message || "Ledger account created successfully!");

      // Reset form
      setFormData({
        name: "",
        groupName: "",
        openingDate: "",
        amount: 0,
        amountType: "Dr",
        address: "",
        phoneNumber: "",
        state: "",
        gstNumber: "",
        bankDetails: undefined
      });

    } catch (error) {
      console.error('Error creating ledger:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create ledger account';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroup.group.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (isGroupNameExists(newGroup.group.trim())) {
      toast.error("Group name already exists");
      return;
    }

    if (isDefaultGroup(newGroup.group.trim())) {
      toast.error("Cannot add default group. This group already exists in the system.");
      return;
    }

    try {
      const response = await fetch('/api/ledger/ledgerGroup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group: newGroup.group.trim(),
          parentgroup: newGroup.parentGroup || undefined,
          fpoId: fpoId
        }),
      });

      if (response.ok) {
        await loadLedgerGroups();
        setFormData(prev => ({ ...prev, groupName: newGroup.group.trim() }));
        setNewGroup({ group: "", parentGroup: "" });
        setShowGroupDialog(false);
        toast.success("Group added successfully!");
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to add group');
      }
    } catch (error) {
      console.error('Error adding group:', error);
      toast.error("Failed to add group");
    }
  };

  const flattenedGroups = flattenHierarchy(hierarchicalGroups);

  if (!fpoId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">FPO ID Required</h2>
          <p className="text-muted-foreground">Please ensure you are logged in with a valid FPO account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add Ledger Account</h1>
              <p className="text-muted-foreground">Create a new ledger account</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
              <X className="mr-2 w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none">
              <Save className="mr-2 w-4 h-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter the ledger account name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupName">
                    Group Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.groupName}
                      onValueChange={(value) => handleInputChange("groupName", value)}
                      disabled={loadingGroups}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={loadingGroups ? "Loading..." : "Select a group"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {flattenedGroups.map((item, index) => (
                          <SelectItem 
                            key={`${item.group.group}-${index}`} 
                            value={item.group.group}
                            className="font-mono text-sm"
                          >
                            {item.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="shrink-0">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] mx-4">
                        <DialogHeader>
                          <DialogTitle>Add Group</DialogTitle>
                          <DialogDescription>
                            Create a new ledger group to organize your accounts.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="parentGroup">Parent Group</Label>
                            <Select
                              value={newGroup.parentGroup || "__root__"}
                              onValueChange={(value) =>
                                setNewGroup(prev => ({
                                  ...prev,
                                  parentGroup: value === "__root__" ? "" : value
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                                <SelectItem value="__root__">None (Root Group)</SelectItem>
                                {flattenedGroups.map((item, index) => (
                                  <SelectItem 
                                    key={`${item.group.group}-${index}`} 
                                    value={item.group.group}
                                    className="font-mono text-sm"
                                  >
                                    {item.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="groupName">Group Name</Label>
                            <Input
                              id="groupName"
                              value={newGroup.group}
                              onChange={(e) => setNewGroup(prev => ({ ...prev, group: e.target.value }))}
                              placeholder="Type Group Name"
                              required
                            />
                          </div>
                        </div>

                        <DialogFooter className="pt-4">
                          <Button type="button" variant="outline" onClick={() => setShowGroupDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddGroup}>Submit</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openingDate">Opening Date</Label>
                  <Input
                    id="openingDate"
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => handleInputChange("openingDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Opening Balance</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", parseFloat(e.target.value) || 0)}
                      placeholder="Enter opening balance"
                      min="0"
                      step="0.01"
                      className="flex-1"
                    />
                    <RadioGroup
                      value={formData.amountType}
                      onValueChange={(value) => handleInputChange("amountType", value)}
                      className="flex shrink-0"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Cr" id="Cr" />
                        <Label htmlFor="Cr">Cr</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Dr" id="Dr" />
                        <Label htmlFor="Dr">Dr</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details - Only show for Bank Accounts */}
          {isBankAccountGroup(formData.groupName) && formData.bankDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">
                      Account Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountNumber"
                      value={formData.bankDetails.accountNumber}
                      onChange={(e) => handleBankDetailsChange("accountNumber", e.target.value)}
                      placeholder="Enter account number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={formData.bankDetails.accountHolderName || ""}
                      onChange={(e) => handleBankDetailsChange("accountHolderName", e.target.value)}
                      placeholder="As per bank records"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">
                      IFSC Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ifscCode"
                      value={formData.bankDetails.ifscCode}
                      onChange={(e) => handleIFSCChange(e.target.value)}
                      placeholder="e.g., HDFC0001234"
                      maxLength={11}
                      required
                    />
                    {formData.bankDetails.ifscCode && !validateIFSC(formData.bankDetails.ifscCode) && (
                      <p className="text-xs text-red-500">Invalid IFSC format (should be like ABCD0123456)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="BankName">Bank Name</Label>
                    <Input
                      id="BankName"
                      value={formData.bankDetails.BankName || ""}
                      onChange={(e) => handleBankDetailsChange("BankName", e.target.value)}
                      placeholder="Auto-detected from IFSC or enter manually"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">
                      Account Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.bankDetails.accountType}
                      onValueChange={(value) => handleBankDetailsChange("accountType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Regular">Regular Account</SelectItem>
                        <SelectItem value="OD">Overdraft (OD)</SelectItem>
                        <SelectItem value="CC">Cash Credit (CC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={formData.bankDetails.upiId || ""}
                      onChange={(e) => handleBankDetailsChange("upiId", e.target.value)}
                      placeholder="e.g., yourfpo@hdfcbank"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information - Only show for non-bank accounts */}
          {!isBankAccountGroup(formData.groupName) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter address"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleInputChange("state", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="--Select State--" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                    placeholder="Enter the GSTIN"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="sm:order-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="sm:order-2">
              <Save className="mr-2 w-4 h-4" />
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}