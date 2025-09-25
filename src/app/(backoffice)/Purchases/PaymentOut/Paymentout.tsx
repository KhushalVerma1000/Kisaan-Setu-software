"use client"
import LedgerAccountSelect from '@/components/ledgers/LedgerAccountSelectComponent'
import DocumentSelect from '@/components/shared/document/documentSelect'
import PaymentDocumentInfo from '@/components/shared/Payment/paymentDocumentInfo'
import PaymentMethodSelect, { PaymentMethodBooksValue, PaymentMethodValue } from '@/components/shared/Payment/paymentMethodSelect'
import { LedgerAccount } from '@/server/features/ledger/core/entities/Ledger'
import { PaymentInput, PaymentDocumentInput } from '@/server/services/ApplicationServices/paymentService/paymentApplicationService'
import { paymentApi } from '@/server/services/ApplicationServices/paymentService/utils/paymentApi'
import { PaymentType, PaymentMethod } from '@/server/features/Payment/core/entities/Payment'
import { PaymentDocument } from '@/server/features/Payment/core/entities/PaymentDocument'
import { useAppSelector } from '@/store/hooks'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { convertKeysToCamel, snakeToCamel } from '@/utils/caseConvertor'

interface PaymentFormState {
  amount: string;
  description: string;
  referenceNumber: string; // Added reference number to form state
  paymentDate: string; // Added payment date to form state
}

const PaymentOutPage = () => {
  // State management
  const [account, setAccount] = useState<LedgerAccount | null>(null)
  const [document, setDocument] = useState<any>(null)
  const [documentID, setDocumentID] = useState<any>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue | PaymentMethodBooksValue | null>(null)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    amount: '',
    description: '',
    referenceNumber: '', // Initialize reference number
    paymentDate: new Date().toISOString().split('T')[0] // Initialize with today's date in YYYY-MM-DD format
  })
  
  // Payment processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // New state for remaining balance from PaymentDocumentInfo component
  const [remainingBalance, setRemainingBalance] = useState<number>(0)

  const user = useAppSelector((state) => state.user);
  const selectedFpoId = user?.fpoId || '';

  // Helper function to reset form after successful payment
  const resetFormAfterSuccess = useCallback(() => {
    setTimeout(() => {
      setAccount(null)
      setDocument(null)
      setDocumentID('')
      setPaymentMethod(null)
      setPaymentForm({
        amount: '',
        description: '',
        referenceNumber: '', // Reset reference number
        paymentDate: new Date().toISOString().split('T')[0] // Reset to today's date
      })
      setSuccess(null)
      setRemainingBalance(0)
    }, 3000)
  }, [])

  // Helper function to safely handle errors
  const handleError = (error: any): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unknown error occurred'
  }

  // Reset form when document changes
  useEffect(() => {
    if (document) {
      const defaultDescription = `Payment made for Purchase Voucher ${document.voucherNumber || document.invoiceNumber}`
      setPaymentForm(prev => ({
        ...prev,
        amount: '',
        description: defaultDescription
        // Keep reference number as it might be entered by user
      }))
      setError(null)
      setSuccess(null)
    }
  }, [document])

  // Handle payment document updates from PaymentDocumentInfo component
  const handlePaymentDocumentUpdate = useCallback((paymentDocument: PaymentDocument) => {
    console.log('Payment document updated:', paymentDocument)
    // You can add any additional logic here if needed
  }, [])

  // Handle remaining balance changes from PaymentDocumentInfo component
  const handleRemainingBalanceChange = useCallback((balance: number) => {
    if (balance) {
      setRemainingBalance(balance)
    }
    // If remaining balance is 0 or negative, clear the payment amount to prevent overpayment
  }, [])

  // Create proper PaymentInput with all required fields
  const createPaymentInput = (): PaymentInput => {
    const methodType = getPaymentMethodType()
    
    const basePayment: PaymentInput = {
      amount: parseFloat(paymentForm.amount),
      method: methodType as PaymentMethod,
      type: 'payment_out' as PaymentType,
      date: new Date(paymentForm.paymentDate), // Use selected date instead of current date
      partyLedgerAccountId: document?.supplier?.id || document?.supplierVendorId,
      notes: paymentForm.description || '',
      paymentStatus: 'active',
      fpoId: selectedFpoId,
      createdAt: new Date(),
      updatedAt: new Date(),
      referenceNumber: paymentForm.referenceNumber  // Use user input or fallback to generated
    }

    // Add the appropriate book ID based on payment method type
    if (methodType === 'cash') {
      const cashbookId = getCashbookId()
      if (cashbookId) {
        basePayment.cashbookId = cashbookId
      }
    }

    if (methodType === 'bank_transfer') {
      const bankbookId = getBankbookId()
      if (bankbookId) {
        basePayment.bankbookId = bankbookId
      }
    }

    return basePayment
  }

  // Process payment
  const handleProcessPayment = async () => {
    // Basic frontend validation only
    if (!isFormValid()) {
      const errorMsg = 'Please fill all required fields'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Validate payment amount
    const paymentAmount = parseFloat(paymentForm.amount)
    if (paymentAmount <= 0) {
      const errorMsg = 'Payment amount must be greater than zero'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Prevent payment if remaining balance is zero or negative
    if (remainingBalance <= 0) {
      const errorMsg = 'Cannot process payment - this purchase voucher is already fully paid'
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    // Check if payment amount exceeds remaining balance
    if (paymentAmount > remainingBalance) {
      const errorMsg = `Payment amount (₹${paymentAmount}) exceeds remaining balance (₹${remainingBalance})`
      setError(errorMsg)
      toast.error(errorMsg)
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      const paymentInput = createPaymentInput()

      const documentInput: PaymentDocumentInput = {
        documentId: documentID,
        documentType: document.documentType,
        documentNumber: document.voucherNumber || document.invoiceNumber,
        totalDocumentAmount: document.summary.grandTotal,
        fpoId: document.fpoId
      }

      console.log('Processing payment out:', { paymentInput, documentInput })

      // Let the backend handle all validation and processing
      const result = await paymentApi.processPayment(paymentInput, documentInput)

      if (result.success && result.data) {
        console.log('Payment made successfully:', result.data)

        const successMsg = `Payment of ₹${paymentForm.amount} made successfully!`
        setSuccess(successMsg)
        toast.success(successMsg)
        
        // Schedule form cleanup after 3 seconds
        resetFormAfterSuccess()
        
      } else {
        throw new Error(result.error || 'Payment processing failed')
      }

    } catch (error) {
      console.error('Payment processing error:', error)
      const errorMessage = handleError(error)
      const fullErrorMsg = `Payment failed: ${errorMessage}`
      setError(fullErrorMsg)
      toast.error(fullErrorMsg)
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper functions
  const getPaymentMethodType = (): 'cash' | 'bank_transfer' => {
    if (!paymentMethod) return 'cash'
    
    if (typeof paymentMethod === 'object' && paymentMethod !== null && 'type' in paymentMethod) {
      return paymentMethod.type as 'cash' | 'bank_transfer'
    }
    
    if (typeof paymentMethod === 'string') {
      return paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash'
    }
    
    return 'cash'
  }

  const getPaymentBookId = (): string | undefined => {
    if (!paymentMethod || typeof paymentMethod !== 'object') return undefined
    
    if ('id' in paymentMethod && paymentMethod.id) {
      return paymentMethod.id as string
    }
    
    return undefined
  }

  const getCashbookId = (): string | undefined => {
    const methodType = getPaymentMethodType()
    return methodType === 'cash' ? getPaymentBookId() : undefined
  }

  const getBankbookId = (): string | undefined => {
    const methodType = getPaymentMethodType()
    return methodType === 'bank_transfer' ? getPaymentBookId() : undefined
  }

  const getPaymentMethodName = (): string => {
    if (!paymentMethod || typeof paymentMethod !== 'object') return 'Cash'
    
    if ('name' in paymentMethod && paymentMethod.name) {
      return paymentMethod.name as string
    }
    
    return getPaymentMethodType() === 'bank_transfer' ? 'Bank Transfer' : 'Cash'
  }

  const getBankAccountId = (): string | undefined => {
    if (!paymentMethod || typeof paymentMethod !== 'object') return undefined
    
    if ('bankAccountId' in paymentMethod && paymentMethod.bankAccountId) {
      return paymentMethod.bankAccountId as string
    }
    
    return undefined
  }

  // Form validation
  const isFormValid = (): boolean => {
    return !!(
      account &&
      document &&
      documentID &&
      paymentMethod &&
      paymentForm.amount &&
      parseFloat(paymentForm.amount) > 0
      // Reference number is optional, so not included in validation
    )
  }

  // Get placeholder text for reference number based on payment method
  const getReferenceNumberPlaceholder = (): string => {
    const methodType = getPaymentMethodType()
    switch (methodType) {
      case 'bank_transfer':
        return 'Enter UPI ID, Transaction ID, or Bank Reference'
      case 'cash':
        return 'Enter Voucher Number or Reference (optional)'
      default:
        return 'Enter reference number (optional)'
    }
  }

  return (
    <div className='w-full h-full flex gap-6 p-6'>
      <div className='flex-1 space-y-6'>
        {/* Account Selection */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Select Party (Payee)</h3>
          <LedgerAccountSelect
            value={account?.id}
            onValueChange={setAccount}
            label='Select Supplier/Vendor'
            size='sm'
            showBalanceType={true}
            showGroupName={true}
            showOpeningBalance={false}
          />
        </div>

        {/* Document Selection */}
        {account && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Select Purchase Voucher</h3>
            <DocumentSelect
              ledgerId={account.id}
              documentType='purchase_voucher'
              value={documentID}
              onValueChange={setDocumentID}
              fullDocument={document}
              onFullDocumentChange={setDocument}
              mode='full-document'
            />
          </div>
        )}

        {/* Payment Voucher Details */}
        {document && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Payment Voucher Details</h3>
            
            {/* Payment Method */}
            <div className="mb-4">
              <PaymentMethodSelect
                fpoId={selectedFpoId}
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                label="Payment Made Through"
                required
                books={true}
              />
            </div>

            {/* Payment Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the date when the payment was made (cannot be in the future)
              </p>
            </div>

            {/* Reference Number Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number 
                <span className="text-gray-500 font-normal">
                  {getPaymentMethodType() === 'bank_transfer' ? ' (UPI ID, Transaction ID, etc.)' : ' (Optional)'}
                </span>
              </label>
              <input
                type="text"
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={getReferenceNumberPlaceholder()}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                {getPaymentMethodType() === 'bank_transfer' 
                  ? 'For bank transfers, please enter UPI ID, transaction ID, or cheque number for reference'
                  : 'Optional reference for your records (e.g., voucher number, cheque number)'
                }
              </p>
            </div>

            {/* Payment Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Pay *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={remainingBalance > 0 ? remainingBalance : undefined}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                disabled={remainingBalance <= 0}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  remainingBalance <= 0 ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder={remainingBalance <= 0 ? "Purchase voucher fully paid" : "Enter amount to pay"}
              />
              {document?.summary?.grandTotal && (
                <p className="text-sm text-gray-600 mt-1">
                  Total Purchase Amount: ₹{document.summary.grandTotal}
                </p>
              )}
              {remainingBalance !== document?.summary?.grandTotal && remainingBalance > 0 && (
                <p className="text-sm text-blue-600 mt-1">
                  Remaining Balance: ₹{remainingBalance}
                </p>
              )}
              {remainingBalance <= 0 && (
                <p className="text-sm text-green-600 mt-1">
                  ✓ Purchase voucher is fully paid - no additional payment needed
                </p>
              )}
            </div>

            {/* Quick Payment Actions */}
            {remainingBalance > 0 && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium text-gray-800 mb-3">Quick Actions</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentForm(prev => ({ ...prev, amount: remainingBalance.toString() }))}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    disabled={isProcessing}
                  >
                    Pay Full Balance (₹{remainingBalance})
                  </button>
                  {remainingBalance > 1000 && (
                    <button
                      onClick={() => setPaymentForm(prev => ({ ...prev, amount: (remainingBalance / 2).toString() }))}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      disabled={isProcessing}
                    >
                      Pay Half (₹{remainingBalance / 2})
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Payment Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Description
              </label>
              <textarea
                value={paymentForm.description}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Enter payment description (optional)"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
                {success}
              </div>
            )}

            {/* Process Payment Button */}
            <button
              onClick={handleProcessPayment}
              disabled={!isFormValid() || isProcessing}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Making Payment...
                </span>
              ) : (
                'Make Payment'
              )}
            </button>

            {/* Simplified Form Status */}
            <div className="mt-4 text-sm text-gray-600">
              <p>Form Status:</p>
              <ul className="list-disc list-inside space-y-1">
                <li className={account ? 'text-green-600' : 'text-red-600'}>
                  {account ? '✓' : '✗'} Payee selected
                </li>
                <li className={document ? 'text-green-600' : 'text-red-600'}>
                  {document ? '✓' : '✗'} Purchase voucher selected
                </li>
                <li className={paymentMethod ? 'text-green-600' : 'text-red-600'}>
                  {paymentMethod ? '✓' : '✗'} Payment method selected
                </li>
                <li className={paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? 'text-green-600' : 'text-red-600'}>
                  {paymentForm.amount && parseFloat(paymentForm.amount) > 0 ? '✓' : '✗'} Valid amount entered
                </li>
                <li className={paymentForm.referenceNumber ? 'text-green-600' : 'text-yellow-600'}>
                  {paymentForm.referenceNumber ? '✓' : '○'} Reference number {paymentForm.referenceNumber ? 'entered' : '(optional)'}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Document Information Panel */}
      <div className="flex-1">
        {document && (
          <div className="space-y-4">
            {/* PaymentDocumentInfo Component with new props */}
            <PaymentDocumentInfo 
              document={document}
              payingAmount={parseFloat(paymentForm.amount) || 0}
              onUpdate={handlePaymentDocumentUpdate}
              onRemainingBalanceChange={handleRemainingBalanceChange}
            />
            
            {/* Payment Method Summary */}
            {paymentMethod && (
              <div className="bg-white p-4 rounded-lg shadow">
                <h4 className="font-medium text-gray-800 mb-3">Payment Method</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span className="font-medium">{getPaymentMethodName()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="capitalize">{getPaymentMethodType().replace('_', ' ')}</span>
                  </div>
                  {paymentForm.referenceNumber && (
                    <div className="flex justify-between">
                      <span>Reference:</span>
                      <span className="font-mono text-xs break-all">{paymentForm.referenceNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentOutPage