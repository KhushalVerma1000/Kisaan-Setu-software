import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLedgerAccountsAsync, selectAllLedgerAccounts, selectLedgerAccountsLoading, selectLedgerAccountsError } from '@/store/slices/ledgerAccountSlice';
import { LedgerAccount } from '@/server/features/ledger/core/entities/Ledger';
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
  /**
   * The selected ledger account ID
   */
  value?: string;
  
  /**
   * Callback when selection changes
   */
  onValueChange: (ledgerAccount: LedgerAccount | null) => void;
  
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
   * Filter ledger accounts by balance type
   */
  balanceType?: 'Dr' | 'Cr';
  
  /**
   * Filter ledger accounts by group name
   */
  groupName?: string;
  
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
   * Show balance type in trigger
   */
  showBalanceType?: boolean;

  /**
   * Show group name in dropdown
   */
  showGroupName?: boolean;

  /**
   * Show opening balance in dropdown
   */
  showOpeningBalance?: boolean;
}

export const LedgerAccountSelect: React.FC<LedgerAccountSelectProps> = ({
  value,
  onValueChange,
  label = "Ledger Account",
  placeholder = "-- Select Ledger Account --",
  required = false,
  disabled = false,
  className,
  balanceType,
  groupName,
  error,
  size = 'md',
  autoFetch = true,
  showBalanceType = true,
  showGroupName = true,
  showOpeningBalance = false,
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
    
    if (balanceType) {
      filtered = filtered.filter(account => account.balanceType === balanceType);
    }
    
    if (groupName) {
      filtered = filtered.filter(account => account.groupName === groupName);
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgerAccounts, balanceType, groupName]);

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
          {groupName && ` (${groupName} group)`}
        </p>
      )}
    </div>
  );
};

export default LedgerAccountSelect;