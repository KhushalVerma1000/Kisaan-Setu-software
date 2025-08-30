import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw, Wallet, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePaymentMethods, PaymentMethodOption } from '@/hooks/usePaymentMethods';

export type PaymentMethodType = 'cash' | 'bank_transfer';

export interface PaymentMethodValue {
  type: PaymentMethodType;
  id: string;
  name: string;
}

interface PaymentMethodSelectProps {
  /**
   * The FPO ID to fetch bank accounts for
   */
  fpoId?: string;
  
  /**
   * The selected payment method
   */
  value?: PaymentMethodValue | null;
  
  /**
   * Callback when selection changes
   */
  onValueChange: (paymentMethod: PaymentMethodValue | null) => void;
  
  /**
   * Label for the select input
   */
  label?: string;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Show error state
   */
  error?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Auto-fetch data on mount
   */
  autoFetch?: boolean;

  /**
   * Show refresh button
   */
  showRefresh?: boolean;

  /**
   * Show count of available payment methods
   */
  showCount?: boolean;

  /**
   * Include cash option
   */
  includeCash?: boolean;

  /**
   * Include bank transfer option
   */
  includeBankTransfer?: boolean;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  fpoId,
  value,
  onValueChange,
  label = "Payment Method",
  placeholder = "Select payment method",
  required = false,
  disabled = false,
  className,
  error,
  size = 'md',
  autoFetch = true,
  showRefresh = true,
  showCount = true,
  includeCash = true,
  includeBankTransfer = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Use the custom hook
  const { 
    cashbookId, 
    bankAccounts, 
    loading, 
    error: hookError, 
    refetch 
  } = usePaymentMethods({
    fpoId,
    autoFetch,
    enabled: !!fpoId,
  });

  // Build payment method options
  const paymentMethodOptions: PaymentMethodOption[] = [];
  
  // Add cash option if cashbook is available and cash is enabled
  if (includeCash && cashbookId) {
    paymentMethodOptions.push({
      type: 'cash',
      id: cashbookId,
      name: 'Cash',
      displayName: 'Cash',
    });
  }

  // Add bank account options if bank transfer is enabled
  if (includeBankTransfer && bankAccounts.length > 0) {
    bankAccounts.forEach(account => {
      paymentMethodOptions.push({
        type: 'bank_transfer',
        id: account.id,
        name: account.accountHolderName,
        displayName: `${account.accountHolderName} (${account.accountNumber.slice(-4)})`,
        bankName: account.bankName,
      });
    });
  }

  // Handle selection
  const handleValueChange = (selectedValue: string) => {
    if (!selectedValue) {
      onValueChange(null);
      return;
    }
    
    const selectedOption = paymentMethodOptions.find(option => 
      `${option.type}-${option.id}` === selectedValue
    );
    
    if (selectedOption) {
      onValueChange({
        type: selectedOption.type,
        id: selectedOption.id,
        name: selectedOption.name,
      });
    } else {
      onValueChange(null);
    }
  };

  // Get selected value for display
  const selectedValue = value ? `${value.type}-${value.id}` : "";
  const selectedOption = paymentMethodOptions.find(option => 
    `${option.type}-${option.id}` === selectedValue
  );

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  // Check if component is disabled
  const isDisabled = disabled || !fpoId || loading;

  // Get placeholder text based on state
  const getPlaceholderText = () => {
    if (!fpoId) return "Select FPO first";
    if (loading) return "Loading payment methods...";
    if (paymentMethodOptions.length === 0) return "No payment methods available";
    return placeholder;
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Get icon for payment method type
  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'cash':
        return <Wallet className="h-4 w-4 text-green-600" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor="payment-method-select" className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Select Component */}
      <div className="relative">
        <Select
          value={selectedValue}
          onValueChange={handleValueChange}
          disabled={isDisabled}
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <SelectTrigger 
            id="payment-method-select"
            className={cn(
              sizeClasses[size],
              "w-full",
               showRefresh && !loading && fpoId ? "pr-14" : "pr-8",
              (error || hookError) && "border-red-500 focus:border-red-500",
              isDisabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <SelectValue 
              placeholder={getPlaceholderText()}
              className="truncate text-left"
            >
              {selectedOption ? (
                <div className="flex items-center gap-2">
                  {getPaymentMethodIcon(selectedOption.type)}
                  <span>{selectedOption.displayName}</span>
                </div>
              ) : (
                getPlaceholderText()
              )}
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="max-h-60 w-full">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  Loading payment methods...
                </span>
              </div>
            )}

            {/* Error State */}
            {(hookError || error) && !loading && (
              <div className="flex flex-col items-center justify-center py-4 px-2 space-y-2">
                <div className="flex items-center text-red-500">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{error || hookError}</span>
                </div>
                {showRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try again
                  </Button>
                )}
              </div>
            )}

            {/* No FPO Selected */}
            {!fpoId && !loading && (
              <div className="text-center py-4 px-2">
                <span className="text-sm text-muted-foreground">
                  Please select an FPO first
                </span>
              </div>
            )}

            {/* Empty State */}
            {fpoId && !loading && !error && !hookError && paymentMethodOptions.length === 0 && (
              <div className="text-center py-4 px-2 space-y-2">
                <span className="text-sm text-muted-foreground">
                  No payment methods available
                </span>
                {showRefresh && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 " />
                    Refresh
                  </Button>
                )}
              </div>
            )}

            {/* Payment Method Options */}
            {!loading && paymentMethodOptions.length > 0 && (
              <>
                {/* Cash Section */}
                {includeCash && paymentMethodOptions.some(option => option.type === 'cash') && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Cash Payment
                    </div>
                    {paymentMethodOptions
                      .filter(option => option.type === 'cash')
                      .map((option) => (
                        <SelectItem 
                          key={`${option.type}-${option.id}`}
                          value={`${option.type}-${option.id}`}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(option.type)}
                            <span className="font-medium">{option.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </>
                )}

                {/* Bank Transfer Section */}
                {includeBankTransfer && paymentMethodOptions.some(option => option.type === 'bank_transfer') && (
                  <>
                    {includeCash && paymentMethodOptions.some(option => option.type === 'cash') && (
                      <div className="border-t my-1" />
                    )}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Bank Transfer
                    </div>
                    {paymentMethodOptions
                      .filter(option => option.type === 'bank_transfer')
                      .map((option) => (
                        <SelectItem 
                          key={`${option.type}-${option.id}`}
                          value={`${option.type}-${option.id}`}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(option.type)}
                              <div className="flex flex-col">
                                <span className="font-medium">{option.name}</span>
                                {option.bankName && (
                                  <span className="text-xs text-muted-foreground">
                                    {option.bankName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </>
                )}
              </>
            )}
          </SelectContent>
        </Select>

        {/* Refresh button overlay */}
        {showRefresh && !loading && fpoId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            title="Refresh payment methods"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {/* Loading indicator overlay */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {(error || hookError) && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error || hookError}
        </p>
      )}

      {/* Helper Text */}
      {fpoId && paymentMethodOptions.length > 0 && !loading && showCount && (
        <p className="text-xs text-muted-foreground">
          {paymentMethodOptions.length} payment method{paymentMethodOptions.length !== 1 ? 's' : ''} available
          {includeCash && !includeBankTransfer && ' (cash only)'}
          {!includeCash && includeBankTransfer && ' (bank transfer only)'}
        </p>
      )}
    </div>
  );
};

export default PaymentMethodSelect;