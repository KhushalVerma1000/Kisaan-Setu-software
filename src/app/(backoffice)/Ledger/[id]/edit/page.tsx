"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import { ArrowLeft, Save, X, Plus, Loader2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
}

interface HierarchicalGroup {
  group: LedgerGroup;
  children: HierarchicalGroup[];
  level: number;
}

interface LedgerAccount {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  phoneNumber?: string;
  address?: string;
  fpoId: string;
  openingDate?: string;
  state?: string;
  gstNumber?: string;
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

// Helper function to format date for input[type="date"]
const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    // Format as YYYY-MM-DD for HTML date input
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return "";
  }
};

// Helper function to validate phone number
const validatePhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber) return true; // Optional field
  
  // Remove spaces, hyphens, and parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Check if it's a valid Indian phone number
  // Indian mobile numbers: 10 digits starting with 6,7,8,9
  // Indian landline numbers: 10-11 digits with area code
  const mobileRegex = /^[6-9]\d{9}$/;
  const landlineRegex = /^[0-9]{10,11}$/;
  
  return mobileRegex.test(cleaned) || landlineRegex.test(cleaned);
};

export default function EditLedgerPage() {
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId;
  const router = useRouter();
  const params = useParams();
  const ledgerId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>([]);
  const [hierarchicalGroups, setHierarchicalGroups] = useState<HierarchicalGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
    amountType: "Cr",
    address: "",
    phoneNumber: "",
    state: "",
    gstNumber: ""
  });

  const buildHierarchy = (groups: LedgerGroup[]): HierarchicalGroup[] => {
    // Create a map for quick lookup
    const groupMap = new Map<string, LedgerGroup>();
    groups.forEach(group => {
        groupMap.set(group.group, group);
    });

    // Find root groups (groups without parent or with null/undefined parent)
    const rootGroups = groups.filter(group => 
        !group.parentgroup || group.parentgroup === null || group.parentgroup === undefined
    );

    // Recursive function to build hierarchy
    const buildChildren = (parentGroup: LedgerGroup, level: number = 0): HierarchicalGroup => {
        // Find direct children of this group
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

    // Build hierarchy starting from root groups
    const hierarchy = rootGroups
        .sort((a, b) => a.group.localeCompare(b.group))
        .map(rootGroup => buildChildren(rootGroup, 0));

    return hierarchy;
  };

  const flattenHierarchy = (hierarchical: HierarchicalGroup[]): { group: LedgerGroup; displayName: string }[] => {
    const flattened: { group: LedgerGroup; displayName: string }[] = [];
    
    const flatten = (items: HierarchicalGroup[]) => {
        items.forEach(item => {
            // Create proper indentation with visual hierarchy
            const indent = "  ".repeat(item.level);
            const connector = item.level > 0 ? "├─ " : "";
            const displayName = `${indent}${connector}${item.group.group}`;
            
            flattened.push({
                group: item.group,
                displayName: displayName
            });
            
            // Recursively flatten children
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

  // Load ledger data
  const loadLedgerData = async () => {
    if (!ledgerId) return;

    setLoadingLedger(true);
    setError(null);

    try {
      const response = await fetch(`/api/ledger/ledgerAccount/${ledgerId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch ledger data');
      }

      const ledgerData: LedgerAccount = await response.json();
      
      // Populate form with existing data
      setFormData({
        name: ledgerData.name || "",
        groupName: ledgerData.groupName || "",
        openingDate: formatDateForInput(ledgerData.openingDate), // Fixed: Format date properly
        amount: ledgerData.openingBalance || 0,
        amountType: ledgerData.balanceType || "Cr",
        address: ledgerData.address || "",
        phoneNumber: ledgerData.phoneNumber || "",
        state: ledgerData.state || "",
        gstNumber: ledgerData.gstNumber || ""
      });

    } catch (error) {
      console.error('Error loading ledger data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ledger data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (fpoId && ledgerId) {
      loadLedgerData();
      loadLedgerGroups();
    }
  }, [fpoId, ledgerId]);

  useEffect(() => {
    if (ledgerGroups.length > 0) {
      const hierarchy = buildHierarchy(ledgerGroups);
      setHierarchicalGroups(hierarchy);
    } else {
      setHierarchicalGroups([]);
    }
  }, [ledgerGroups]);

  const loadLedgerGroups = async () => {
    setLoadingGroups(true);
    try {
        const response = await fetch(`/api/ledger/ledgerGroup?fpo_id=${fpoId}`);
        
        if (response.ok) {
            const allGroups = await response.json();
            
            // Map the response to LedgerGroup instances
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Ledger name is required");
      return;
    }

    if (!formData.groupName) {
      toast.error("Please select a group");
      return;
    }

    // Phone number validation
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      toast.error("Please enter a valid phone number (10 digits for mobile, 10-11 digits for landline)");
      return;
    }

    // GST number validation (if provided)
    if (formData.gstNumber && formData.gstNumber.trim().length > 0) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(formData.gstNumber.trim())) {
        toast.error("Please enter a valid GST number");
        return;
      }
    }

    // Date validation (if provided)
    if (formData.openingDate) {
      const selectedDate = new Date(formData.openingDate);
      const currentDate = new Date();
      
      if (selectedDate > currentDate) {
        toast.error("Opening date cannot be in the future");
        return;
      }
    }

    if (!fpoId) {
      toast.error("FPO ID is missing");
      return;
    }

    if (!ledgerId) {
      toast.error("Ledger ID is missing");
      return;
    }

    setLoading(true);

    try {
      // Prepare data according to the API expectations
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
      };

      console.log('Sending update request data:', requestData);

      const response = await fetch(`/api/ledger/ledgerAccount/${ledgerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.details || `HTTP error! status: ${response.status}`);
      }

      toast.success(result.message || "Ledger account updated successfully!");

      // Navigate back to ledger list
      router.push('/Ledger');

    } catch (error) {
      console.error('Error updating ledger:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update ledger account';
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

    // Check if group name already exists
    if (isGroupNameExists(newGroup.group.trim())) {
      toast.error("Group name already exists");
      return;
    }

    // Prevent adding default groups
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
        // Reload groups to get the updated list
        await loadLedgerGroups();
        
        // Set the newly created group as selected
        setFormData(prev => ({ ...prev, groupName: newGroup.group.trim() }));
        
        // Reset form and close dialog
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

  // Get flattened hierarchy for group selection
  const flattenedGroups = flattenHierarchy(hierarchicalGroups);

  // Show loading or error state if required data is not available
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

  if (!ledgerId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Invalid Ledger ID</h2>
          <p className="text-muted-foreground">Ledger ID is required to edit the account.</p>
          <Button className="mt-4" onClick={() => router.push('/ledger')}>
            Go Back to Ledger List
          </Button>
        </div>
      </div>
    );
  }

  if (loadingLedger) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading Ledger Data</h2>
          <p className="text-muted-foreground">Please wait while we fetch the ledger information.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-bold">Edit Ledger Account</h1>
              <p className="text-muted-foreground">Error loading ledger data</p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => router.push('/ledger')} variant="outline">
              Go Back to Ledger List
            </Button>
            <Button onClick={loadLedgerData}>
              Retry Loading
            </Button>
          </div>
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
              <h1 className="text-2xl font-bold">Edit Ledger Account</h1>
              <p className="text-muted-foreground">Update the ledger account information</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => router.back()} className="flex-1 sm:flex-none">
              <X className="mr-2 w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 sm:flex-none">
              <Save className="mr-2 w-4 h-4" />
              {loading ? "Updating..." : "Update"}
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
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
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

          {/* Additional Information */}
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
                    placeholder="Enter phone number (10 digits)"
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit phone number"
                  />
                  {formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber) && (
                    <p className="text-sm text-red-500">
                      Please enter a valid phone number (10 digits for mobile)
                    </p>
                  )}
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
                  onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                  placeholder="Enter the GSTIN (15 characters)"
                  maxLength={15}
                />
                {formData.gstNumber && formData.gstNumber.length > 0 && (
                  <p className="text-sm text-gray-500">
                    Format: 22AAAAA0000A1Z5 (15 characters)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Final Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} className="sm:order-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="sm:order-2">
              <Save className="mr-2 w-4 h-4" />
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}