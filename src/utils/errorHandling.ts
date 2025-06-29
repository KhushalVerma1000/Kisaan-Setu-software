// utils/errorHandling.ts
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export class ShareholderError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message);
    this.name = 'ShareholderError';
    this.code = code;
    this.details = details;
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_INPUT: 'INVALID_INPUT',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: ApiError,
  message?: string
): ApiResponse<T> {
  return {
    success,
    data,
    error,
    message
  };
}

export function handleDatabaseError(error: any): ShareholderError {
  console.error('Database error:', error);
  
  if (error.code === '23505') { // Unique constraint violation
    if (error.constraint === 'unique_aadhaar_per_fpo') {
      return new ShareholderError(
        'A shareholder with this Aadhaar number already exists for this FPO',
        ErrorCodes.DUPLICATE_ENTRY,
        { constraint: error.constraint }
      );
    }
    return new ShareholderError(
      'This record already exists',
      ErrorCodes.DUPLICATE_ENTRY
    );
  }
  
  if (error.code === '23514') { // Check constraint violation
    return new ShareholderError(
      'Invalid data provided - check constraints failed',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  if (error.code === '23502') { // Not null constraint violation
    return new ShareholderError(
      'Required field is missing',
      ErrorCodes.VALIDATION_ERROR
    );
  }
  
  return new ShareholderError(
    error.message || 'Database operation failed',
    ErrorCodes.DATABASE_ERROR
  );
}

export function handleAuthError(error: any): ShareholderError {
  console.error('Authentication error:', error);
  return new ShareholderError(
    'Authentication failed',
    ErrorCodes.AUTHENTICATION_ERROR
  );
}

export function isShareholderError(error: any): error is ShareholderError {
  return error instanceof ShareholderError;
}

// Toast notification helpers for frontend
export const showSuccessToast = (message: string) => {
  // You can integrate with your preferred toast library
  console.log('SUCCESS:', message);
  alert(`✅ ${message}`);
};

export const showErrorToast = (message: string) => {
  console.error('ERROR:', message);
  alert(`❌ ${message}`);
};

export const showWarningToast = (message: string) => {
  console.warn('WARNING:', message);
  alert(`⚠️ ${message}`);
};

// Validation helpers
export const validateBulkData = (data: any[]): { valid: any[], invalid: { item: any, errors: string[] }[] } => {
  const valid = [];
  const invalid = [];
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const errors = [];
    
    if (!item.name?.trim()) errors.push('Name is required');
    if (!item.fatherName?.trim()) errors.push('Father name is required');
    if (!item.mobile?.toString().match(/^[6-9]\d{9}$/)) errors.push('Invalid mobile number');
    if (!item.aadhaar?.toString().match(/^\d{12}$/)) errors.push('Invalid Aadhaar number');
    if (!item.landDetails?.trim()) errors.push('Land details are required');
    if (!item.khasraNo?.trim()) errors.push('Khasra number is required');
    if (!item.shareAlloted || item.shareAlloted <= 0) errors.push('Share alloted must be greater than 0');
    if (!item.faceValue || item.faceValue <= 0) errors.push('Face value must be greater than 0');
    if (item.totalPaid < 0) errors.push('Total paid cannot be negative');
    
    if (errors.length === 0) {
      valid.push(item);
    } else {
      invalid.push({ item: { ...item, rowNumber: i + 2 }, errors }); // +2 because of header and 0-indexing
    }
  }
  
  return { valid, invalid };
};