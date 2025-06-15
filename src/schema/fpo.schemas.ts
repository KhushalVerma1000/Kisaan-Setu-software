// schemas/fpo.schemas.ts
import { z } from 'zod';

// Base address schema
export const AddressSchema = z.object({
  street: z.string().min(1, "Street is required").optional(),
  city: z.string().min(1, "City is required").optional(),
  state: z.string().min(1, "State is required").optional(),
  pincode: z.string()
    .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .optional(),
  country: z.string().min(1, "Country is required").optional(),
});

// Social media schema
// export const SocialMediaSchema = z.object({
//   facebook: z.string().url("Invalid Facebook URL").optional().or(z.literal("")),
//   twitter: z.string().url("Invalid Twitter URL").optional().or(z.literal("")),
//   instagram: z.string().url("Invalid Instagram URL").optional().or(z.literal("")),
// });

// Main FPO profile update schema
export const FPOProfileUpdateSchema = z.object({
  // Basic Information
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .optional(),
  
  email: z.string()
    .email("Invalid email format")
    .optional(),
  
  phone: z.string()
    .regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number format")
    .optional(),
  
  // Address Information
  address: AddressSchema.optional(),
  
  // FPO Specific Information
  registrationNumber: z.string()
    .min(1, "Registration number is required")
    .optional(),
  
  establishedYear: z.number()
    .int("Year must be an integer")
    .min(1900, "Year must be after 1900")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional(),
  
  memberCount: z.number()
    .int("Member count must be an integer")
    .min(0, "Member count cannot be negative")
    .optional(),
  
  cropTypes: z.array(z.string().min(1, "Crop type cannot be empty"))
    .min(1, "At least one crop type is required")
    .optional(),
  
  certifications: z.array(z.string().min(1, "Certification cannot be empty"))
    .optional(),
  
  description: z.string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  
  website: z.string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("")), // Allow empty string
  
  // socialMedia: SocialMediaSchema.optional(),
  
  // Financial Information
  annualTurnover: z.number()
    .min(0, "Annual turnover cannot be negative")
    .optional(),
  
  // Status fields
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).strict(); // This ensures no additional properties are allowed

// Schema for creating a new FPO profile (more strict requirements)
export const FPOProfileCreateSchema = z.object({
  // Required fields for creation
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  
  email: z.string()
    .email("Invalid email format"),
  
  phone: z.string()
    .regex(/^[+]?[0-9]{10,15}$/, "Invalid phone number format"),
  
  address: AddressSchema,
  
  registrationNumber: z.string()
    .min(1, "Registration number is required"),
  
  establishedYear: z.number()
    .int("Year must be an integer")
    .min(1900, "Year must be after 1900")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  
  memberCount: z.number()
    .int("Member count must be an integer")
    .min(1, "Member count must be at least 1"),
  
  cropTypes: z.array(z.string().min(1, "Crop type cannot be empty"))
    .min(1, "At least one crop type is required"),
  
  // Optional fields for creation
  certifications: z.array(z.string().min(1, "Certification cannot be empty"))
    .optional(),
  
  description: z.string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional(),
  
  website: z.string()
    .url("Invalid website URL")
    .optional()
    .or(z.literal("")),
  
  // socialMedia: SocialMediaSchema.optional(),
  
  annualTurnover: z.number()
    .min(0, "Annual turnover cannot be negative")
    .optional(),
}).strict();

// Schema for query parameters (for GET requests with filters)
export const FPOQuerySchema = z.object({
  page: z.string()
    .regex(/^[0-9]+$/, "Page must be a number")
    .transform(Number)
    .refine(val => val > 0, "Page must be greater than 0")
    .optional(),
  
  limit: z.string()
    .regex(/^[0-9]+$/, "Limit must be a number")
    .transform(Number)
    .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
    .optional(),
  
  search: z.string()
    .min(1, "Search term cannot be empty")
    .optional(),
  
  cropType: z.string()
    .min(1, "Crop type cannot be empty")
    .optional(),
  
  state: z.string()
    .min(1, "State cannot be empty")
    .optional(),
  
  isVerified: z.string()
    .regex(/^(true|false)$/, "isVerified must be 'true' or 'false'")
    .transform(val => val === 'true')
    .optional(),
}).strict();

// Type exports
export type FPOProfileUpdate = z.infer<typeof FPOProfileUpdateSchema>;
export type FPOProfileCreate = z.infer<typeof FPOProfileCreateSchema>;
export type FPOQuery = z.infer<typeof FPOQuerySchema>;
export type Address = z.infer<typeof AddressSchema>;
// export type SocialMedia = z.infer<typeof SocialMediaSchema>;

// Validation helper functions
export function validateFPOUpdate(data: unknown) {
  return FPOProfileUpdateSchema.safeParse(data);
}

export function validateFPOCreate(data: unknown) {
  return FPOProfileCreateSchema.safeParse(data);
}

export function validateFPOQuery(data: unknown) {
  return FPOQuerySchema.safeParse(data);
}