// @/server/features/vouchers/infrastructure/api/actions/voucherActions.ts
"use server";

import { VoucherService } from "@/server/features/vouchers/application/VoucherService";
import { revalidatePath } from "next/cache";
import { VoucherLineItem } from "@/server/features/vouchers/core/entities/VoucherSystem";

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (data instanceof Date) {
    return data.toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }
  
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        serialized[key] = serializeData(data[key]);
      }
    }
    return serialized;
  }
  
  return data;
}

// ============================================================================
// COMMON TYPES
// ============================================================================

interface BaseVoucherResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface VoucherLineItemInput {
  ledgerAccountId: string;
  amount: number;
  type: 'Dr' | 'Cr';
  description: string;
}

// ============================================================================
// PAYMENT VOUCHER ACTIONS (MULTI-ENTRY)
// ============================================================================

interface CreatePaymentVoucherInput {
  fpoId: string;
  date: string;
  description: string;
  notes?: string;
  lineItems: VoucherLineItemInput[];
  createdBy?: string;
}

export async function createPaymentVoucherAction(
  input: CreatePaymentVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.fpoId || !input.date || !input.description || !input.lineItems) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    if (input.lineItems.length < 2) {
      return {
        success: false,
        error: "At least 2 line items are required"
      };
    }

    // Validate each line item
    for (const item of input.lineItems) {
      if (!item.ledgerAccountId || !item.type || !item.description) {
        return {
          success: false,
          error: "Each line item must have ledgerAccountId, type, and description"
        };
      }
      if (item.amount <= 0) {
        return {
          success: false,
          error: "All line item amounts must be greater than 0"
        };
      }
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    // Validate balance
    const totalDebits = input.lineItems
      .filter(item => item.type === 'Dr')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalCredits = input.lineItems
      .filter(item => item.type === 'Cr')
      .reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
      };
    }

    // Call service layer
    const result = await VoucherService.createPaymentVoucher({
      fpoId: input.fpoId,
      date,
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems,
      createdBy: input.createdBy
    });

    // Revalidate paths
    revalidatePath('/PaymentReceiptContra/Payment');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message
      })
    };
  } catch (error) {
    console.error('Create payment voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment voucher'
    };
  }
}

// ============================================================================
// RECEIPT VOUCHER ACTIONS (MULTI-ENTRY)
// ============================================================================

interface CreateReceiptVoucherInput {
  fpoId: string;
  date: string;
  description: string;
  notes?: string;
  lineItems: VoucherLineItemInput[];
  createdBy?: string;
}

export async function createReceiptVoucherAction(
  input: CreateReceiptVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.fpoId || !input.date || !input.description || !input.lineItems) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    if (input.lineItems.length < 2) {
      return {
        success: false,
        error: "At least 2 line items are required"
      };
    }

    // Validate each line item
    for (const item of input.lineItems) {
      if (!item.ledgerAccountId || !item.type || !item.description) {
        return {
          success: false,
          error: "Each line item must have ledgerAccountId, type, and description"
        };
      }
      if (item.amount <= 0) {
        return {
          success: false,
          error: "All line item amounts must be greater than 0"
        };
      }
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    // Validate balance
    const totalDebits = input.lineItems
      .filter(item => item.type === 'Dr')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalCredits = input.lineItems
      .filter(item => item.type === 'Cr')
      .reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
      };
    }

    // Call service layer
    const result = await VoucherService.createReceiptVoucher({
      fpoId: input.fpoId,
      date,
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems,
      createdBy: input.createdBy
    });

    // Revalidate paths
    revalidatePath('/PaymentReceiptContra/Receipt');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message
      })
    };
  } catch (error) {
    console.error('Create receipt voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create receipt voucher'
    };
  }
}

// ============================================================================
// CONTRA VOUCHER ACTIONS (MULTI-ENTRY)
// ============================================================================

interface CreateContraVoucherInput {
  fpoId: string;
  date: string;
  description: string;
  notes?: string;
  lineItems: VoucherLineItemInput[];
  createdBy?: string;
}

export async function createContraVoucherAction(
  input: CreateContraVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.fpoId || !input.date || !input.description || !input.lineItems) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    if (input.lineItems.length < 2) {
      return {
        success: false,
        error: "At least 2 line items are required"
      };
    }

    // Validate each line item
    for (const item of input.lineItems) {
      if (!item.ledgerAccountId || !item.type || !item.description) {
        return {
          success: false,
          error: "Each line item must have ledgerAccountId, type, and description"
        };
      }
      if (item.amount <= 0) {
        return {
          success: false,
          error: "All line item amounts must be greater than 0"
        };
      }
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    // Validate balance
    const totalDebits = input.lineItems
      .filter(item => item.type === 'Dr')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalCredits = input.lineItems
      .filter(item => item.type === 'Cr')
      .reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
      };
    }

    // Call service layer
    const result = await VoucherService.createContraVoucher({
      fpoId: input.fpoId,
      date,
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems,
      createdBy: input.createdBy
    });

    // Revalidate paths
    revalidatePath('/PaymentReceiptContra/Contra');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message
      })
    };
  } catch (error) {
    console.error('Create contra voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contra voucher'
    };
  }
}

// ============================================================================
// JOURNAL VOUCHER ACTIONS (MULTI-ENTRY)
// ============================================================================

interface CreateJournalVoucherInput {
  fpoId: string;
  date: string;
  description: string;
  notes?: string;
  lineItems: VoucherLineItemInput[];
  createdBy?: string;
}

export async function createJournalVoucherAction(
  input: CreateJournalVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.fpoId || !input.date || !input.description || !input.lineItems) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    if (input.lineItems.length < 2) {
      return {
        success: false,
        error: "At least 2 line items are required"
      };
    }

    // Validate each line item
    for (const item of input.lineItems) {
      if (!item.ledgerAccountId || !item.type || !item.description) {
        return {
          success: false,
          error: "Each line item must have ledgerAccountId, type, and description"
        };
      }
      if (item.amount <= 0) {
        return {
          success: false,
          error: "All line item amounts must be greater than 0"
        };
      }
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    // Validate balance
    const totalDebits = input.lineItems
      .filter(item => item.type === 'Dr')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalCredits = input.lineItems
      .filter(item => item.type === 'Cr')
      .reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return {
        success: false,
        error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
      };
    }

    // Call service layer
    const result = await VoucherService.createJournalVoucher({
      fpoId: input.fpoId,
      date,
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems,
      createdBy: input.createdBy
    });

    // Revalidate paths
    revalidatePath('/Journal');
    revalidatePath('/Journal/add');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message
      })
    };
  } catch (error) {
    console.error('Create journal voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create journal voucher'
    };
  }
}

// ============================================================================
// REVERSAL VOUCHER ACTION
// ============================================================================

interface CreateReversalVoucherInput {
  originalVoucherId: string;
  reversalDate: string;
  reversalDescription?: string;
  createdBy?: string;
}

export async function createReversalVoucherAction(
  input: CreateReversalVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    if (!input.originalVoucherId || !input.reversalDate) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    const date = new Date(input.reversalDate);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    const result = await VoucherService.createReversalVoucher(
      input.originalVoucherId,
      date,
      input.reversalDescription,
      input.createdBy
    );

    revalidatePath('/Journal');
    revalidatePath('/dashboard/accounting');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message
      })
    };
  } catch (error) {
    console.error('Create reversal voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reversal voucher'
    };
  }
}

// ============================================================================
// DELETE VOUCHER ACTION
// ============================================================================

export async function deleteVoucherAction(voucherId: string): Promise<BaseVoucherResponse> {
  try {
    if (!voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    const result = await VoucherService.deleteVoucher(voucherId);

    revalidatePath('/payRecContra/payment');
    revalidatePath('/payRecContra/receipt');
    revalidatePath('/payRecContra/contra');
    revalidatePath('/Journal');
    revalidatePath('/dashboard/accounting');

    return {
      success: true,
      data: serializeData(result)
    };
  } catch (error) {
    console.error('Delete voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete voucher'
    };
  }
}

// ============================================================================
// GENERATE VOUCHER NUMBER ACTION
// ============================================================================

interface GenerateVoucherNumberInput {
  fpoId: string;
  voucherType: 'payment' | 'receipt' | 'contra' | 'journal';
  date: string;
}

export async function generateVoucherNumberAction(
  input: GenerateVoucherNumberInput
): Promise<BaseVoucherResponse> {
  try {
    if (!input.fpoId || !input.voucherType || !input.date) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    const date = new Date(input.date);
    if (isNaN(date.getTime())) {
      return {
        success: false,
        error: "Invalid date"
      };
    }

    const voucherNumber = await VoucherService.generateVoucherNumber(
      input.voucherType,
      date,
      input.fpoId
    );

    return {
      success: true,
      data: { voucherNumber }
    };
  } catch (error) {
    console.error('Generate voucher number error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate voucher number'
    };
  }
}

// ============================================================================
// GET VOUCHER DETAILS ACTION
// ============================================================================

export async function getVoucherDetailsAction(voucherId: string): Promise<BaseVoucherResponse> {
  try {
    if (!voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    const result = await VoucherService.getVoucherDetails(voucherId);

    if (!result) {
      return {
        success: false,
        error: "Voucher not found"
      };
    }

    return {
      success: true,
      data: serializeData(result)
    };
  } catch (error) {
    console.error('Get voucher details error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get voucher details'
    };
  }
}

// ============================================================================
// GET VOUCHERS FOR PERIOD ACTION
// ============================================================================

interface GetVouchersForPeriodInput {
  fpoId: string;
  startDate: string;
  endDate: string;
  voucherType?: 'payment' | 'receipt' | 'contra' | 'journal';
}

export async function getVouchersForPeriodAction(
  input: GetVouchersForPeriodInput
): Promise<BaseVoucherResponse> {
  try {
    if (!input.fpoId || !input.startDate || !input.endDate) {
      return {
        success: false,
        error: "Missing required fields"
      };
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Invalid date range"
      };
    }

    const vouchers = await VoucherService.getVouchersForPeriod({
      fpoId: input.fpoId,
      startDate,
      endDate,
      voucherType: input.voucherType
    });

    return {
      success: true,
      data: serializeData(vouchers)
    };
  } catch (error) {
    console.error('Get vouchers for period error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get vouchers'
    };
  }
}


// Add these update actions to your voucherActions.ts file

// ============================================================================
// UPDATE PAYMENT VOUCHER ACTION
// ============================================================================

interface UpdatePaymentVoucherInput {
  voucherId: string;
  description?: string;
  notes?: string;
  lineItems?: VoucherLineItemInput[];
}

export async function updatePaymentVoucherAction(
  input: UpdatePaymentVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    // If updating line items, validate them
    if (input.lineItems) {
      if (input.lineItems.length < 2) {
        return {
          success: false,
          error: "At least 2 line items are required"
        };
      }

      // Validate each line item
      for (const item of input.lineItems) {
        if (!item.ledgerAccountId || !item.type || !item.description) {
          return {
            success: false,
            error: "Each line item must have ledgerAccountId, type, and description"
          };
        }
        if (item.amount <= 0) {
          return {
            success: false,
            error: "All line item amounts must be greater than 0"
          };
        }
      }

      // Validate balance
      const totalDebits = input.lineItems
        .filter(item => item.type === 'Dr')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const totalCredits = input.lineItems
        .filter(item => item.type === 'Cr')
        .reduce((sum, item) => sum + item.amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
        };
      }
    }

    // Call service layer to update
    const result = await VoucherService.updateVoucher(input.voucherId, {
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems
    });

    // Revalidate paths
    revalidatePath('/payRecContra/payment');
    revalidatePath('/payRecContra');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message || "Payment voucher updated successfully"
      })
    };
  } catch (error) {
    console.error('Update payment voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update payment voucher'
    };
  }
}

// ============================================================================
// UPDATE RECEIPT VOUCHER ACTION
// ============================================================================

interface UpdateReceiptVoucherInput {
  voucherId: string;
  description?: string;
  notes?: string;
  lineItems?: VoucherLineItemInput[];
}

export async function updateReceiptVoucherAction(
  input: UpdateReceiptVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    // If updating line items, validate them
    if (input.lineItems) {
      if (input.lineItems.length < 2) {
        return {
          success: false,
          error: "At least 2 line items are required"
        };
      }

      // Validate each line item
      for (const item of input.lineItems) {
        if (!item.ledgerAccountId || !item.type || !item.description) {
          return {
            success: false,
            error: "Each line item must have ledgerAccountId, type, and description"
          };
        }
        if (item.amount <= 0) {
          return {
            success: false,
            error: "All line item amounts must be greater than 0"
          };
        }
      }

      // Validate balance
      const totalDebits = input.lineItems
        .filter(item => item.type === 'Dr')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const totalCredits = input.lineItems
        .filter(item => item.type === 'Cr')
        .reduce((sum, item) => sum + item.amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
        };
      }
    }

    // Call service layer to update
    const result = await VoucherService.updateVoucher(input.voucherId, {
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems
    });

    // Revalidate paths
    revalidatePath('/payRecContra/receipt');
    revalidatePath('/payRecContra');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message || "Receipt voucher updated successfully"
      })
    };
  } catch (error) {
    console.error('Update receipt voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update receipt voucher'
    };
  }
}

// ============================================================================
// UPDATE CONTRA VOUCHER ACTION
// ============================================================================

interface UpdateContraVoucherInput {
  voucherId: string;
  description?: string;
  notes?: string;
  lineItems?: VoucherLineItemInput[];
}

export async function updateContraVoucherAction(
  input: UpdateContraVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    // If updating line items, validate them
    if (input.lineItems) {
      if (input.lineItems.length < 2) {
        return {
          success: false,
          error: "At least 2 line items are required"
        };
      }

      // Validate each line item
      for (const item of input.lineItems) {
        if (!item.ledgerAccountId || !item.type || !item.description) {
          return {
            success: false,
            error: "Each line item must have ledgerAccountId, type, and description"
          };
        }
        if (item.amount <= 0) {
          return {
            success: false,
            error: "All line item amounts must be greater than 0"
          };
        }
      }

      // Validate balance
      const totalDebits = input.lineItems
        .filter(item => item.type === 'Dr')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const totalCredits = input.lineItems
        .filter(item => item.type === 'Cr')
        .reduce((sum, item) => sum + item.amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
        };
      }
    }

    // Call service layer to update (matches your existing service signature)
    const result = await VoucherService.updateVoucher(input.voucherId, {
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems
    });

    // Revalidate paths
    revalidatePath('/payRecContra/contra');
    revalidatePath('/payRecContra');
    revalidatePath('/PaymentReceiptContra');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message || "Contra voucher updated successfully"
      })
    };
  } catch (error) {
    console.error('Update contra voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update contra voucher'
    };
  }
}

// ============================================================================
// UPDATE JOURNAL VOUCHER ACTION
// ============================================================================

interface UpdateJournalVoucherInput {
  voucherId: string;
  description?: string;
  notes?: string;
  lineItems?: VoucherLineItemInput[];
}

export async function updateJournalVoucherAction(
  input: UpdateJournalVoucherInput
): Promise<BaseVoucherResponse> {
  try {
    // Validation
    if (!input.voucherId) {
      return {
        success: false,
        error: "Voucher ID is required"
      };
    }

    // If updating line items, validate them
    if (input.lineItems) {
      if (input.lineItems.length < 2) {
        return {
          success: false,
          error: "At least 2 line items are required"
        };
      }

      // Validate each line item
      for (const item of input.lineItems) {
        if (!item.ledgerAccountId || !item.type || !item.description) {
          return {
            success: false,
            error: "Each line item must have ledgerAccountId, type, and description"
          };
        }
        if (item.amount <= 0) {
          return {
            success: false,
            error: "All line item amounts must be greater than 0"
          };
        }
      }

      // Validate balance
      const totalDebits = input.lineItems
        .filter(item => item.type === 'Dr')
        .reduce((sum, item) => sum + item.amount, 0);
      
      const totalCredits = input.lineItems
        .filter(item => item.type === 'Cr')
        .reduce((sum, item) => sum + item.amount, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        return {
          success: false,
          error: `Entries not balanced. Dr: ₹${totalDebits.toFixed(2)}, Cr: ₹${totalCredits.toFixed(2)}`
        };
      }
    }

    // Call service layer to update
    const result = await VoucherService.updateVoucher(input.voucherId, {
      description: input.description,
      notes: input.notes,
      lineItems: input.lineItems
    });

    // Revalidate paths
    revalidatePath('/journal');
    revalidatePath('/Journal');

    return {
      success: true,
      data: serializeData({
        voucher: result.voucher,
        ledgerEntries: result.ledgerEntries,
        message: result.message || "Journal voucher updated successfully"
      })
    };
  } catch (error) {
    console.error('Update journal voucher error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update journal voucher'
    };
  }
}