// Types for land and pond details
export interface LandDetail {
  area: number; // in hectares
  khasraNumber?: string; // optional khasra number
}

export interface PondDetail {
  area: number; // in hectares
  khasraNumber?: string; // optional khasra number
}

export interface CattleDetail {
  type: string; // e.g., "Cow", "Buffalo", "Goat", "Sheep", etc.
  count: number; // number of cattle of this type
}

// Constants for dropdown options
export const CATTLE_TYPES = [
  "Cow", 
  "Buffalo", 
  "Goat", 
  "Sheep", 
  "Ox", 
  "Bull", 
  "Calf", 
  "Other"
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
] as const;

export const SOCIAL_CATEGORIES = [
  { value: "General", label: "General" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "OBC", label: "OBC" }
] as const;

export interface ShareholderProps {
  id?: string;
  fpoId?: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails?: LandDetail; // Single land detail entry (optional)
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
  pondDetails?: PondDetail[]; // Array of individual pond details (optional)
  cattleDetails?: CattleDetail[]; // Array of cattle details (optional)
  createdAt?: Date;
  updatedAt?: Date;
}

export class Shareholder {
  id?: string;
  fpoId?: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails?: LandDetail;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
  pondDetails: PondDetail[];
  cattleDetails: CattleDetail[];
  createdAt?: Date;
  updatedAt?: Date;

  constructor(props: ShareholderProps) {
    // Helper function to safely convert to string
    const toString = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };

    // Helper function to safely convert arrays
    const toArray = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value === null || value === undefined) return [];
      // If it's a string that looks like JSON, try to parse it
      if (typeof value === 'string' && value.trim().startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return [];
    };

    // Helper function to safely parse land details
    const parseLandDetails = (value: any): LandDetail | undefined => {
      if (!value || value === null || value === undefined) return undefined;
      
      // If it's already an object with area property
      if (typeof value === 'object' && value.area !== undefined) {
        return {
          area: Number(value.area) || 0,
          khasraNumber: value.khasraNumber || value.khasra_number || undefined
        };
      }
      
      // If it's a string that looks like JSON
      if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(value);
          return {
            area: Number(parsed.area) || 0,
            khasraNumber: parsed.khasraNumber || parsed.khasra_number || undefined
          };
        } catch {
          return undefined;
        }
      }
      
      return undefined;
    };

    this.id = props.id;
    this.fpoId = props.fpoId;
    this.name = toString(props.name);
    this.fatherName = toString(props.fatherName);
    this.mobile = toString(props.mobile);
    this.aadhaar = toString(props.aadhaar);
    this.gender = props.gender || 'male';
    this.socialCategory = props.socialCategory || 'General';
    this.landDetails = parseLandDetails(props.landDetails);
    this.shareAlloted = props.shareAlloted || 0;
    this.faceValue = props.faceValue || 100;
    this.totalPaid = props.totalPaid || 0;
    this.isDirector = props.isDirector || false;
    this.pondDetails = toArray(props.pondDetails);
    this.cattleDetails = toArray(props.cattleDetails);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Validation methods (existing ones remain the same)
  isValidMobile(): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;
    return mobileRegex.test(this.mobile);
  }

  isValidAadhaar(): boolean {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(this.aadhaar);
  }

  isValidName(): boolean {
    return this.name.length >= 2 && this.name.length <= 100;
  }

  isValidFatherName(): boolean {
    return this.fatherName.length >= 2 && this.fatherName.length <= 100;
  }

  // Updated validation methods
  isValidLandDetails(): boolean {
    if (!this.landDetails) return true; // Optional field
    return typeof this.landDetails.area === 'number' && 
           this.landDetails.area >= 0 && 
           Number.isFinite(this.landDetails.area);
  }

  isValidPondDetails(): boolean {
    if (!Array.isArray(this.pondDetails)) return false;
    return this.pondDetails.every(pond => 
      typeof pond.area === 'number' && 
      pond.area >= 0 &&
      Number.isFinite(pond.area) &&
      (pond.khasraNumber === undefined || typeof pond.khasraNumber === 'string')
    );
  }

  isValidCattleDetails(): boolean {
    if (!Array.isArray(this.cattleDetails)) return false;
    return this.cattleDetails.every(cattle => 
      typeof cattle.type === 'string' && 
      typeof cattle.count === 'number' && 
      cattle.type.trim().length > 0 && 
      cattle.count > 0 &&
      Number.isInteger(cattle.count)
    );
  }

  // Business logic methods (existing ones remain the same)
  getTotalInvestment(): number {
    return this.shareAlloted * this.faceValue;
  }

  getRemainingAmount(): number {
    return Math.max(0, this.getTotalInvestment() - this.totalPaid);
  }

  isFullyPaid(): boolean {
    return this.totalPaid >= this.getTotalInvestment();
  }

  getPaymentPercentage(): number {
    const totalInvestment = this.getTotalInvestment();
    return totalInvestment > 0 ? Math.round((this.totalPaid / totalInvestment) * 100) : 0;
  }

  getPaymentStatus(): 'Fully Paid' | 'Partially Paid' | 'Unpaid' {
    const percentage = this.getPaymentPercentage();
    if (percentage >= 100) return 'Fully Paid';
    if (percentage > 0) return 'Partially Paid';
    return 'Unpaid';
  }

  // Updated business logic methods
  getLandArea(): number {
    return this.landDetails?.area || 0;
  }

  getTotalPondArea(): number {
    return this.pondDetails.reduce((total, pond) => total + pond.area, 0);
  }

  getTotalPondCount(): number {
    return this.pondDetails.length;
  }

  getTotalCattleCount(): number {
    return this.cattleDetails.reduce((total, cattle) => total + cattle.count, 0);
  }

  getCattleByType(): Record<string, number> {
    const cattleByType: Record<string, number> = {};
    this.cattleDetails.forEach(cattle => {
      cattleByType[cattle.type] = (cattleByType[cattle.type] || 0) + cattle.count;
    });
    return cattleByType;
  }

  // New method to determine shareholder type
  getShareholderType(): 'land' | 'pond' | 'cattle' | 'none' {
    if (this.landDetails && this.landDetails.area > 0) return 'land';
    if (this.pondDetails.length > 0) return 'pond';
    if (this.cattleDetails.length > 0) return 'cattle';
    return 'none';
  }

  // Utility methods
  toJSON(): Record<string, any> {
    const obj: Record<string, any> = {
      fpo_id: this.fpoId,
      name: this.name,
      father_name: this.fatherName,
      mobile: this.mobile,
      aadhaar: this.aadhaar,
      gender: this.gender,
      social_category: this.socialCategory,
      land_details: this.landDetails ? JSON.stringify(this.landDetails) : null,
      share_alloted: this.shareAlloted,
      face_value: this.faceValue,
      total_paid: this.totalPaid,
      is_director: this.isDirector,
      pond_details: JSON.stringify(this.pondDetails),
      cattle_details: JSON.stringify(this.cattleDetails),
    };
    
    // Only include id if it is set (for updates)
    if (this.id) obj.id = this.id;
    return obj;
  }

  // Convert to display format
  toDisplayObject(): Record<string, any> {
    return {
      id: this.id,
      fpoId: this.fpoId,
      name: this.name,
      fatherName: this.fatherName,
      mobile: this.mobile,
      aadhaar: this.aadhaar,
      gender: this.gender,
      socialCategory: this.socialCategory,
      landDetails: this.landDetails,
      shareAlloted: this.shareAlloted,
      faceValue: this.faceValue,
      totalPaid: this.totalPaid,
      totalInvestment: this.getTotalInvestment(),
      remainingAmount: this.getRemainingAmount(),
      paymentPercentage: this.getPaymentPercentage(),
      paymentStatus: this.getPaymentStatus(),
      isDirector: this.isDirector,
      pondDetails: this.pondDetails,
      cattleDetails: this.cattleDetails,
      landArea: this.getLandArea(),
      totalPondArea: this.getTotalPondArea(),
      totalPondCount: this.getTotalPondCount(),
      totalCattleCount: this.getTotalCattleCount(),
      cattleByType: this.getCattleByType(),
      shareholderType: this.getShareholderType(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Comprehensive validation for all fields
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Name validation
    if (!this.name.trim()) {
      errors.push('Name is required');
    } else if (!this.isValidName()) {
      errors.push('Name must be between 2 and 100 characters');
    }

    // Father name validation
    if (!this.fatherName.trim()) {
      errors.push('Father name is required');
    } else if (!this.isValidFatherName()) {
      errors.push('Father name must be between 2 and 100 characters');
    }

    // Mobile validation
    if (!this.mobile.trim()) {
      errors.push('Mobile number is required');
    } else if (!this.isValidMobile()) {
      errors.push('Mobile number must be a valid 10-digit Indian number starting with 6-9');
    }

    // Aadhaar validation
    if (!this.aadhaar.trim()) {
      errors.push('Aadhaar number is required');
    } else if (!this.isValidAadhaar()) {
      errors.push('Aadhaar number must be exactly 12 digits');
    }

    // Share alloted validation
    if (this.shareAlloted <= 0) {
      errors.push('Share alloted must be greater than 0');
    } else if (!Number.isInteger(this.shareAlloted)) {
      errors.push('Share alloted must be a whole number');
    }

    // Face value validation
    if (this.faceValue <= 0) {
      errors.push('Face value must be greater than 0');
    } else if (!Number.isInteger(this.faceValue)) {
      errors.push('Face value must be a whole number');
    }

    // Total paid validation
    if (this.totalPaid < 0) {
      errors.push('Total paid cannot be negative');
    } else if (this.totalPaid > this.getTotalInvestment()) {
      errors.push('Total paid cannot exceed total investment amount');
    }

    // Gender validation
    if (!['male', 'female', 'other'].includes(this.gender)) {
      errors.push('Gender must be male, female, or other');
    }

    // Social category validation
    if (!['General', 'SC', 'ST', 'OBC'].includes(this.socialCategory)) {
      errors.push('Social category must be General, SC, ST, or OBC');
    }

    // Land details validation (optional)
    if (!this.isValidLandDetails()) {
      errors.push('Land details must be valid - area must be a non-negative number');
    }

    // Pond details validation
    if (!this.isValidPondDetails()) {
      errors.push('Pond details must be valid - each pond must have a non-negative area');
    }

    // Cattle details validation
    if (!this.isValidCattleDetails()) {
      errors.push('Cattle details must be valid - each cattle entry must have a valid type and positive count');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Static method to create from database row
  static fromDatabaseRow(row: any): Shareholder {
    return new Shareholder({
      id: row.id,
      fpoId: row.fpo_id,
      name: row.name,
      fatherName: row.father_name,
      mobile: row.mobile,
      aadhaar: row.aadhaar,
      gender: row.gender,
      socialCategory: row.social_category,
      landDetails: row.land_details,
      shareAlloted: row.share_alloted,
      faceValue: row.face_value,
      totalPaid: row.total_paid,
      isDirector: row.is_director,
      pondDetails: row.pond_details ? JSON.parse(row.pond_details) : [],
      cattleDetails: row.cattle_details ? JSON.parse(row.cattle_details) : [],
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }
}