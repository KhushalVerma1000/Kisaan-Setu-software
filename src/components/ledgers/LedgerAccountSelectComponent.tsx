import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLedgerAccountsAsync, selectAllLedgerAccounts, selectLedgerAccountsLoading, selectLedgerAccountsError } from '@/store/slices/ledgerAccountSlice';
import { LedgerAccount } from '@/server/features/ledger/core/entities/Ledger';
import { SYSTEM_LEDGER_CODES } from '@/constants/systemLedgerCodes';
import { toast } from 'react-toastify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LedgerAccountSelectProps {
  value?: string;
  onValueChange: (ledgerAccount: LedgerAccount | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  editable?: boolean; // NEW: Toggle between editable select and read-only display
  className?: string;
  balanceType?: 'Dr' | 'Cr';
  groupName?: string; // Deprecated: use groupNames instead
  groupNames?: string[]; // Array of group names to filter
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFetch?: boolean;
  showBalanceType?: boolean;
  showGroupName?: boolean;
  showOpeningBalance?: boolean;
  hideCalculationLedgers?: boolean;
}

// System ledgers that users commonly use in manual voucher entries
const TRANSACTIONAL_SYSTEM_LEDGERS = new Set<string>([
  SYSTEM_LEDGER_CODES.CASH,
  SYSTEM_LEDGER_CODES.PETTY_CASH,
  SYSTEM_LEDGER_CODES.CAPITAL,
  SYSTEM_LEDGER_CODES.DRAWINGS,
  SYSTEM_LEDGER_CODES.FREIGHT,
  SYSTEM_LEDGER_CODES.PACKING,
  SYSTEM_LEDGER_CODES.LOADING,
  SYSTEM_LEDGER_CODES.BANK_CHARGES,
  SYSTEM_LEDGER_CODES.INTEREST_BANK,
  SYSTEM_LEDGER_CODES.DISCOUNT_ALLOWED,
  SYSTEM_LEDGER_CODES.DISCOUNT_RECEIVED,
]);

// System ledgers that should be HIDDEN from manual entry selection
const CALCULATION_SYSTEM_LEDGERS = new Set<string>([
  SYSTEM_LEDGER_CODES.SALES,
  SYSTEM_LEDGER_CODES.SALES_RETURN,
  SYSTEM_LEDGER_CODES.PURCHASE,
  SYSTEM_LEDGER_CODES.PURCHASE_RETURN,
  SYSTEM_LEDGER_CODES.GST_INPUT_CGST,
  SYSTEM_LEDGER_CODES.GST_INPUT_SGST,
  SYSTEM_LEDGER_CODES.GST_INPUT_IGST,
  SYSTEM_LEDGER_CODES.GST_OUTPUT_CGST,
  SYSTEM_LEDGER_CODES.GST_OUTPUT_SGST,
  SYSTEM_LEDGER_CODES.GST_OUTPUT_IGST,
  SYSTEM_LEDGER_CODES.TDS_PAYABLE,
  SYSTEM_LEDGER_CODES.TCS_PAYABLE,
  SYSTEM_LEDGER_CODES.TDS_RECEIVABLE,
  SYSTEM_LEDGER_CODES.ROUNDING_OFF,
  SYSTEM_LEDGER_CODES.PROFIT_LOSS,
  SYSTEM_LEDGER_CODES.RETAINED_EARNINGS,
]);

export const LedgerAccountSelect: React.FC<LedgerAccountSelectProps> = ({
  value,
  onValueChange,
  label = "Ledger Account",
  placeholder = "-- Select Ledger Account --",
  required = false,
  disabled = false,
  editable = true, // NEW: Default to editable mode
  className,
  balanceType,
  groupName,
  groupNames,
  error,
  size = 'md',
  autoFetch = true,
  showBalanceType = false,
  showGroupName = true,
  showOpeningBalance = false,
  hideCalculationLedgers = true,
}) => {
  const dispatch = useAppDispatch();
  const ledgerAccounts = useAppSelector(selectAllLedgerAccounts);
  const loading = useAppSelector(selectLedgerAccountsLoading);
  const storeError = useAppSelector(selectLedgerAccountsError);
  
  const [isOpen, setIsOpen] = useState(false);

  // Fetch ledger accounts on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch && ledgerAccounts.length === 0 && !loading) {
      dispatch(fetchLedgerAccountsAsync()).unwrap().catch((error) => {
        toast.error(`Failed to load ledger accounts: ${error}`);
      });
    }
  }, [dispatch, autoFetch, ledgerAccounts.length, loading]);

  // Filter ledger accounts based on props and exclude accounts with invalid IDs
  const filteredAccounts = React.useMemo(() => {
    let filtered = ledgerAccounts.filter(account => 
      account.id != null && 
      account.id !== undefined && 
      account.id !== ''
    );
    
    // Filter out calculation system ledgers if hideCalculationLedgers is true
    if (hideCalculationLedgers) {
      filtered = filtered.filter(account => {
        if (!account.isSystemLedger || !account.ledgerCode) {
          return true;
        }
        return TRANSACTIONAL_SYSTEM_LEDGERS.has(account.ledgerCode);
      });
    }
    
    if (balanceType) {
      filtered = filtered.filter(account => account.balanceType === balanceType);
    }
    
    // Handle both single groupName and multiple groupNames
    if (groupNames && groupNames.length > 0) {
      filtered = filtered.filter(account => 
        account.groupName && groupNames.includes(account.groupName)
      );
    } else if (groupName) {
      filtered = filtered.filter(account => account.groupName === groupName);
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgerAccounts, balanceType, groupName, groupNames, hideCalculationLedgers]);

  // Handle selection
  const handleValueChange = (accountId: string) => {
    if (!accountId) {
      onValueChange(null);
      return;
    }
    
    const selectedAccount = filteredAccounts.find(account => 
      account.id && account.id === accountId
    ) || null;
    onValueChange(selectedAccount);
  };

  // Get selected account for display
  const selectedAccount = filteredAccounts.find(account => 
    account.id && account.id === value
  );

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  };

  // Manual refresh function
  const handleRefresh = () => {
    dispatch(fetchLedgerAccountsAsync()).unwrap().catch((error) => {
      toast.error(`Failed to refresh ledger accounts: ${error}`);
    });
  };

  // Format display text for selected account
  const getDisplayText = (account: LedgerAccount) => {
    let text = account.name;
    if (showBalanceType && account.balanceType) {
      text += ` (${account.balanceType})`;
    }
    return text;
  };

  // Format display text for dropdown items
  const getDropdownDisplayText = (account: LedgerAccount) => {
    let text = account.name;
    if (showBalanceType && account.balanceType) {
      text += ` (${account.balanceType})`;
    }
    return text;
  };

  // Get helper text for group filter
  const getGroupFilterText = () => {
    if (groupNames && groupNames.length > 0) {
      return groupNames.length === 1 
        ? `(${groupNames[0]} group)` 
        : `(${groupNames.length} groups)`;
    } else if (groupName) {
      return `(${groupName} group)`;
    }
    return '';
  };

  // NEW: Render read-only view when editable is false
  if (!editable) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Label */}
        {label && (
          <Label className="text-sm font-medium text-muted-foreground">
            {label}
          </Label>
        )}

        {/* Read-only Display */}
        <div className={cn(
          "w-full px-3 py-2 border border-input bg-muted/30 rounded-md",
          sizeClasses[size],
          "flex items-center"
        )}>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : selectedAccount ? (
            <div className="flex flex-col w-full min-w-0">
              {/* Account name with balance type */}
              <div className="flex items-center justify-between w-full">
                <span className="font-medium truncate">
                  {getDisplayText(selectedAccount)}
                </span>
                {showOpeningBalance && selectedAccount.openingBalance !== undefined && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ₹{selectedAccount.openingBalance.toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Group name as secondary info */}
              {showGroupName && selectedAccount.groupName && (
                <span className="text-xs text-muted-foreground truncate">
                  {selectedAccount.groupName}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // Default editable select view
  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor="ledger-account-select" className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Select Component */}
      <div className="relative">
        <Select
          value={value || ""}
          onValueChange={handleValueChange}
          disabled={disabled || loading}
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <SelectTrigger 
            id="ledger-account-select"
            className={cn(
              sizeClasses[size],
              "w-full",
              error && "border-red-500 focus:border-red-500",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <SelectValue 
              placeholder={placeholder}
              className="truncate text-left"
            >
              {selectedAccount ? getDisplayText(selectedAccount) : placeholder}
            </SelectValue>
          </SelectTrigger>

          <SelectContent className="max-h-60 w-full">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading accounts...</span>
              </div>
            )}

            {/* Error State */}
            {(storeError || error) && !loading && (
              <div className="flex items-center justify-center py-4 px-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-500">{error || storeError}</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && !storeError && filteredAccounts.length === 0 && (
              <div className="text-center py-4 px-2">
                <span className="text-sm text-muted-foreground">No ledger accounts found</span>
                <button
                  onClick={handleRefresh}
                  className="block w-full mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Try refreshing
                </button>
              </div>
            )}

            {/* Account Options */}
            {!loading && filteredAccounts
              .filter(account => account.id != null && account.id !== undefined && account.id !== '')
              .map((account) => (
              <SelectItem 
                key={account.id} 
                value={account.id || ""}
                className="cursor-pointer"
              >
                <div className="flex flex-col w-full min-w-0">
                  {/* Main account name with balance type */}
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium truncate flex-1">
                      {getDropdownDisplayText(account)}
                    </span>
                    {showOpeningBalance && account.openingBalance !== undefined && (
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        ₹{account.openingBalance.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Group name as secondary info */}
                  {showGroupName && account.groupName && (
                    <span className="text-xs text-muted-foreground truncate">
                      {account.groupName}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Loading indicator overlay */}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Helper Text */}
      {filteredAccounts.length > 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''} available
          {balanceType && ` (${balanceType} accounts)`}
          {getGroupFilterText()}
        </p>
      )}
    </div>
  );
};

export default LedgerAccountSelect;