"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Building2, CreditCard, User, Hash, Smartphone, Printer, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAppSelector } from '@/store/hooks';
import { DatePicker } from '@/components/ui/datepicker';

interface BankDetails {
  accountNumber: string;
  accountHolderName?: string;
  ifscCode: string;
  BankName?: string;
  accountType: 'Regular' | 'OD' | 'CC';
  upiId?: string;
}

interface FormData {
  accountName: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  accountType: 'Regular' | 'OD' | 'CC';
  upiId: string;
  openingBalance: number;
  openingDate: Date | undefined;  // Changed from string to Date | undefined
}

// Bank code to name mapping
const BANK_CODES: { [key: string]: string } = {
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
  'BKID': 'Bank of India',
  'CBIN': 'Central Bank of India',
};

// Validation functions
const isValidIfscFormat = (ifsc: string): boolean => {
  const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscPattern.test(ifsc.toUpperCase());
};

const isValidAccountNumberFormat = (accountNumber: string): boolean => {
  const accountPattern = /^[0-9]{5,18}$/;
  return accountPattern.test(accountNumber);
};

const getBankFromIFSC = (ifscCode: string): string | null => {
  if (!isValidIfscFormat(ifscCode)) return null;
  const bankCode = ifscCode.substring(0, 4);
  return BANK_CODES[bankCode] || null;
};

export default function AddBankAccountPage() {
  const user = useAppSelector((state) => state.user);
  const fpoId = user.fpoId;
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    accountName: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    accountType: 'Regular',
    upiId: '',
    openingBalance: 0,
    openingDate: new Date(), // Initialize with Date object
  });

  const [isValidated, setIsValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleInputChange = (field: keyof FormData, value: string | boolean | number | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Reset validation when critical fields change
    if (field === 'accountNumber' || field === 'ifscCode') {
      setIsValidated(false);
    }
  };

  const handleIFSCChange = (ifscCode: string) => {
    const upperIFSC = ifscCode.toUpperCase();
    handleInputChange('ifscCode', upperIFSC);
    
    // Auto-detect bank name from IFSC
    if (upperIFSC.length === 11) {
      const detectedBank = getBankFromIFSC(upperIFSC);
      if (detectedBank) {
        handleInputChange('bankName', detectedBank);
        toast.success(`Detected: ${detectedBank}`);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account name is required';
    }
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!isValidAccountNumberFormat(formData.accountNumber)) {
      newErrors.accountNumber = 'Account number must be 5-18 digits';
    }
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!isValidIfscFormat(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    }
    
    if (formData.upiId && !formData.upiId.includes('@')) {
      newErrors.upiId = 'Invalid UPI ID format (e.g., user@paytm)';
    }

    if (!formData.openingDate) {
      newErrors.openingDate = 'Opening date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidate = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsValidating(true);
    
    // Simulate validation (in real app, you might check for duplicates)
    setTimeout(() => {
      setIsValidated(true);
      setIsValidating(false);
      toast.success('Bank account details validated successfully!');
    }, 500);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }
    
    if (!isValidated) {
      toast.error('Please validate bank account details first');
      return;
    }

    if (!fpoId) {
      toast.error('FPO ID is missing');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare bank details object
      const bankDetails: BankDetails = {
        accountNumber: formData.accountNumber,
        accountHolderName: formData.accountHolderName,
        ifscCode: formData.ifscCode.toUpperCase(),
        BankName: formData.bankName,
        accountType: formData.accountType,
        upiId: formData.upiId || undefined,
      };
      
      // Prepare ledger account data
      const requestData = {
        name: formData.accountName,
        groupName: 'Bank Accounts',
        amount: Number(formData.openingBalance),
        amountType: 'Dr' as 'Dr' | 'Cr',
        openingDate: formData.openingDate ? formData.openingDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        fpoId: fpoId,
        bankDetails: bankDetails,
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

      toast.success('Bank account added successfully!');
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          accountName: '',
          accountHolderName: '',
          accountNumber: '',
          bankName: '',
          ifscCode: '',
          accountType: 'Regular',
          upiId: '',
          openingBalance: 0,
          openingDate: new Date(),
        });
        setIsValidated(false);
        setErrors({});
      }, 1500);
      
    } catch (error) {
      console.error('Error adding bank account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add bank account';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = () => {
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isValidated) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return null;
  };

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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Bank Account</h1>
            <p className="text-gray-600">Add a new bank account to your ledger system</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Details
            </CardTitle>
            <CardDescription>
              Enter the bank account information. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Account Name (Ledger Name) */}
              <div className="space-y-2">
                <Label htmlFor="accountName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Display Name *
                </Label>
                <Input
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  placeholder="e.g., HDFC Current Account, SBI Savings"
                  className={errors.accountName ? 'border-red-500' : ''}
                />
                {errors.accountName && (
                  <p className="text-sm text-red-600">{errors.accountName}</p>
                )}
                <p className="text-xs text-gray-500">This is how the account will appear in your ledger</p>
              </div>

              {/* Account Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="accountHolderName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account Holder Name *
                </Label>
                <Input
                  id="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                  placeholder="Enter full name as per bank records"
                  className={errors.accountHolderName ? 'border-red-500' : ''}
                />
                {errors.accountHolderName && (
                  <p className="text-sm text-red-600">{errors.accountHolderName}</p>
                )}
              </div>

              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Account Number *
                </Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  placeholder="Enter account number"
                  className={errors.accountNumber ? 'border-red-500' : ''}
                />
                {errors.accountNumber && (
                  <p className="text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div>

              {/* IFSC Code & Bank Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ifscCode" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    IFSC Code *
                  </Label>
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => handleIFSCChange(e.target.value)}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                    className={errors.ifscCode ? 'border-red-500' : ''}
                  />
                  {errors.ifscCode && (
                    <p className="text-sm text-red-600">{errors.ifscCode}</p>
                  )}
                  {formData.ifscCode && !isValidIfscFormat(formData.ifscCode) && (
                    <p className="text-xs text-orange-500">Invalid IFSC format</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Name *
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="Auto-detected or enter manually"
                    className={errors.bankName ? 'border-red-500' : ''}
                  />
                  {errors.bankName && (
                    <p className="text-sm text-red-600">{errors.bankName}</p>
                  )}
                </div>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value) => handleInputChange('accountType', value)}
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

              {/* Opening Balance & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => handleInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <DatePicker
                    date={formData.openingDate}
                    onDateChange={(date) => handleInputChange('openingDate', date)}
                    label="Opening Date"
                    placeholder="DD/MM/YYYY or DDMMYYYY"
                    required={true}
                  />
                  {errors.openingDate && (
                    <p className="text-sm text-red-600 mt-1">{errors.openingDate}</p>
                  )}
                </div>
              </div>

              {/* UPI ID */}
              <div className="space-y-2">
                <Label htmlFor="upiId" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI ID (Optional)
                </Label>
                <Input
                  id="upiId"
                  value={formData.upiId}
                  onChange={(e) => handleInputChange('upiId', e.target.value)}
                  placeholder="e.g., yourfpo@paytm"
                  className={errors.upiId ? 'border-red-500' : ''}
                />
                {errors.upiId && (
                  <p className="text-sm text-red-600">{errors.upiId}</p>
                )}
              </div>

              {/* Validation Alert */}
              {isValidated && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription>
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      Bank account details are validated and ready to save
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleValidate}
                  disabled={isValidating || isValidated}
                  className="flex-1"
                >
                  {getValidationIcon()}
                  {isValidating ? 'Validating...' : isValidated ? 'Validated' : 'Validate Details'}
                </Button>
                
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!isValidated || isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Account...
                    </>
                  ) : (
                    'Add Bank Account'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}