import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { SupabaseFPORepository } from '@/server/infrastructure/persistence/supabase/SupabaseFPORepository';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Zod schema for FPO profile validation
const FPOProfileUpdateSchema = z.object({
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
  address: z.object({
    street: z.string().min(1, "Street is required").optional(),
    city: z.string().min(1, "City is required").optional(),
    state: z.string().min(1, "State is required").optional(),
    pincode: z.string()
      .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
      .optional(),
    country: z.string().min(1, "Country is required").optional(),
  }).optional(),
  
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
  
  socialMedia: z.object({
    facebook: z.string().url("Invalid Facebook URL").optional().or(z.literal("")),
    twitter: z.string().url("Invalid Twitter URL").optional().or(z.literal("")),
    instagram: z.string().url("Invalid Instagram URL").optional().or(z.literal("")),
  }).optional(),
  
  // Financial Information
  annualTurnover: z.number()
    .min(0, "Annual turnover cannot be negative")
    .optional(),
  
  // Status fields
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).strict(); // This ensures no additional properties are allowed

// Type for the validated data
type FPOProfileUpdate = z.infer<typeof FPOProfileUpdateSchema>;

// Helper function to handle validation errors
function handleValidationError(error: z.ZodError) {
  const errorMessages = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
  
  return NextResponse.json(
    { 
      error: 'Validation failed', 
      details: errorMessages,
      message: 'Please check the provided data and try again'
    }, 
    { status: 400 }
  );
}

// Helper function to handle authentication
async function getAuthenticatedSession() {
  const supabase = createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error('Authentication error: ' + error.message);
  }
  
  if (!session) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

// GET handler to fetch the current FPO's complete details
export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    
    const supabase = createClient();
    const fpoRepo = new SupabaseFPORepository(supabase);
    const details = await fpoRepo.getCompleteDetails(session.user.id);

    if (!details) {
      return NextResponse.json(
        { error: 'Profile not found', message: 'No FPO profile found for this user' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: details 
    });
    
  } catch (error) {
    console.error('GET /api/fpo/profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to access this resource' }, 
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: 'An unexpected error occurred while fetching profile'
      }, 
      { status: 500 }
    );
  }
}

// PATCH handler to update the profile (PATCH is used for partial updates)
export async function PATCH(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON', 
          message: 'Request body must be valid JSON'
        }, 
        { status: 400 }
      );
    }
    
    // Validate the request body using Zod
    const validationResult = FPOProfileUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return handleValidationError(validationResult.error);
    }
    
    const validatedData: FPOProfileUpdate = validationResult.data;
    
    // Check if the request body is empty after validation
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json(
        { 
          error: 'Empty update', 
          message: 'No valid fields provided for update'
        }, 
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    const fpoRepo = new SupabaseFPORepository(supabase);
    
    // Update the profile with validated data
    const updatedProfile = await fpoRepo.updateProfile(session.user.id, validatedData);
    
    if (!updatedProfile) {
      return NextResponse.json(
        { 
          error: 'Update failed', 
          message: 'Profile could not be updated. Please try again.'
        }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('PATCH /api/fpo/profile error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please log in to access this resource' }, 
        { status: 401 }
      );
    }
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { 
            error: 'Duplicate data', 
            message: 'The provided data conflicts with existing records'
          }, 
          { status: 409 }
        );
      }
      
      if (error.message.includes('foreign key') || error.message.includes('constraint')) {
        return NextResponse.json(
          { 
            error: 'Invalid reference', 
            message: 'The provided data references invalid records'
          }, 
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: 'An unexpected error occurred while updating profile'
      }, 
      { status: 500 }
    );
  }
}