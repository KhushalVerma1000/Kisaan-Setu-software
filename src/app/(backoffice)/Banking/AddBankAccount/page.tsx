"use client"
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Building2, CreditCard, User, Hash, Smartphone, Printer } from 'lucide-react';
import { toast } from 'react-toastify';

// Import your service (in real implementation)
import { BankAccountsService, BankAccountData, BankAccountValidation } from '@/server/features/fpo/infrastructure/apiHelper/BankAccountsService';

// Mock service for demo
const mockBankAccountsService = {
  validateBankAccount: async (accountNumber: string, ifscCode: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      isDuplicate: false,
      isValidIfsc: ifscCode.length === 11,
      isValidAccount: accountNumber.length >= 10,
      isValid: ifscCode.length === 11 && accountNumber.length >= 10
    };
  },
  addSecondaryBankAccount: async (bankData: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id: Date.now().toString(), ...bankData, isPrimary: false };
  },
  isValidIfscFormat: (ifsc: string) => {
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscPattern.test(ifsc.toUpperCase());
  },
  isValidAccountNumberFormat: (accountNumber: string) => {
    const accountPattern = /^[0-9]{5,18}$/;
    return accountPattern.test(accountNumber);
  }
};

interface FormData {
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  upiId: string;
  printBankDetails: boolean;
  printUpiQr: boolean;
}

interface ValidationState {
  isDuplicate: boolean;
  isValidIfsc: boolean;
  isValidAccount: boolean;
  isValid: boolean;
}

export default function AddBankAccountPage() {
  const [formData, setFormData] = useState<FormData>({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    upiId: '',
    printBankDetails: false,
    printUpiQr: false
  });

  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Reset validation when account number or IFSC changes
    if (field === 'accountNumber' || field === 'ifscCode') {
      setValidation(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }
    
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!BankAccountsService.isValidAccountNumberFormat(formData.accountNumber)) {
      newErrors.accountNumber = 'Account number must be 5-18 digits';
    }
    
    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!BankAccountsService.isValidIfscFormat(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    }
    
    if (formData.upiId && !formData.upiId.includes('@')) {
      newErrors.upiId = 'Invalid UPI ID format (e.g., user@paytm)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidate = async () => {
    if (!formData.accountNumber || !formData.ifscCode) {
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsValidating(true);
      const result = await BankAccountsService.validateBankAccount(
        formData.accountNumber,
        formData.ifscCode
      );
      setValidation(result);
    } catch (error) {
      toast.error('Failed to validate bank account details');
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!validation || !validation.isValid) {
      toast.error('Please validate bank account details first');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const bankData = {
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        ifscCode: formData.ifscCode.toUpperCase(),
        upiId: formData.upiId || undefined,
        printBankDetails: formData.printBankDetails,
        printUpiQr: formData.printUpiQr
      };
      
      await BankAccountsService.addSecondaryBankAccount(bankData);
      
      toast.success('Bank account added successfully!');
      
      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          accountHolderName: '',
          accountNumber: '',
          bankName: '',
          ifscCode: '',
          upiId: '',
          printBankDetails: false,
          printUpiQr: false
        });
        setValidation(null);
        setErrors({});
      }, 1500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add bank account';
      toast.error(errorMessage);
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValidationIcon = () => {
    if (isValidating) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (validation?.isValid) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (validation && !validation.isValid) return <XCircle className="h-4 w-4 text-red-600" />;
    return null;
  };

  // Fix the disabled condition to avoid null values
  const isSubmitDisabled = isSubmitting || (validation !== null && !validation.isValid);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Bank Account</h1>
          <p className="text-gray-600">Add a new secondary bank account to your system</p>
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

              {/* Bank Name */}
              <div className="space-y-2">
                <Label htmlFor="bankName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Name *
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                  className={errors.bankName ? 'border-red-500' : ''}
                />
                {errors.bankName && (
                  <p className="text-sm text-red-600">{errors.bankName}</p>
                )}
              </div>

              {/* IFSC Code */}
              <div className="space-y-2">
                <Label htmlFor="ifscCode" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  IFSC Code *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ifscCode"
                    value={formData.ifscCode}
                    onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
                    placeholder="e.g., SBIN0001234"
                    className={`flex-1 ${errors.ifscCode ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    onClick={handleValidate}
                    disabled={isValidating || !formData.accountNumber || !formData.ifscCode}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {getValidationIcon()}
                    Validate
                  </Button>
                </div>
                {errors.ifscCode && (
                  <p className="text-sm text-red-600">{errors.ifscCode}</p>
                )}
              </div>

              {/* Validation Results */}
              {validation && (
                <Alert className={validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  <AlertDescription>
                    {validation.isValid ? (
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        Bank account details are valid and ready to save
                      </div>
                    ) : (
                      <div className="space-y-1 text-red-800">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Validation failed:
                        </div>
                        <ul className="text-sm list-disc list-inside ml-6">
                          {validation.isDuplicate && <li>Account already exists</li>}
                          {!validation.isValidIfsc && <li>Invalid IFSC code</li>}
                          {!validation.isValidAccount && <li>Invalid account number</li>}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

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
                  placeholder="e.g., user@paytm"
                  className={errors.upiId ? 'border-red-500' : ''}
                />
                {errors.upiId && (
                  <p className="text-sm text-red-600">{errors.upiId}</p>
                )}
              </div>

              {/* Print Options */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print Options
                </Label>
                <div className="space-y-3 ml-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="printBankDetails"
                      checked={formData.printBankDetails}
                      onCheckedChange={(checked) => handleInputChange('printBankDetails', checked as boolean)}
                    />
                    <Label htmlFor="printBankDetails" className="text-sm font-normal">
                      Print bank details on documents
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="printUpiQr"
                      checked={formData.printUpiQr}
                      onCheckedChange={(checked) => handleInputChange('printUpiQr', checked as boolean)}
                    />
                    <Label htmlFor="printUpiQr" className="text-sm font-normal">
                      Print UPI QR code on documents
                    </Label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                className="w-full"
                disabled={isSubmitDisabled}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}