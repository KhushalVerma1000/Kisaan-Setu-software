// components/bankbook/BankSelectionModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, Calendar, IndianRupee } from 'lucide-react';

import { BankDetail } from '@/server/features/fpo/core/entities/BankDetail';

interface BankAccount extends BankDetail {
  currentBalance?: number;
  lastUpdated?: string;
}

interface BankSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  onSelectBank: (bankAccount: BankAccount) => void;
  isLoading?: boolean;
}

const BankSelectionModal: React.FC<BankSelectionModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  onSelectBank,
  isLoading = false
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatAccountNumber = (accountNumber: string) => {
    // Mask account number showing only last 4 digits
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Select Bank Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading bank accounts...</span>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bank accounts found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {bankAccounts.map((account) => (
                <Card 
                  key={account.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/50"
                  onClick={() => onSelectBank(account)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {account.bankName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <CreditCard className="w-3 h-3" />
                          {formatAccountNumber(account.accountNumber)}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={account.isPrimary ? 'default' : 'secondary'}>
                          {account.isPrimary ? 'Primary' : 'Secondary'}
                        </Badge>
                        {account.upiId && (
                          <Badge variant="outline" className="text-xs">
                            UPI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Account Holder:</span> {account.accountHolderName}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">IFSC:</span> {account.ifscCode}
                    </div>

                    {account.upiId && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">UPI ID:</span> {account.upiId}
                      </div>
                    )}

                    {account.currentBalance !== undefined && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {formatAmount(account.currentBalance)}
                        </span>
                      </div>
                    )}

                    {account.lastUpdated && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Last updated: {new Date(account.lastUpdated).toLocaleDateString()}
                      </div>
                    )}

                    <Button 
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBank(account);
                      }}
                    >
                      Select This Account
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BankSelectionModal;