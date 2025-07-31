import { Shareholder } from '@/server/features/ShareHolder/core/entities/ShareHolder'
import { ShareholderProps, LandDetail } from '@/server/features/ShareHolder/core/entities/ShareHolder'
import { createClient } from '@/utils/supabase/server'

// Helper function to safely parse JSON strings
const safeJsonParse = (jsonString: any): any[] => {
  // Handle null, undefined, or empty values
  if (!jsonString || jsonString === null || jsonString === undefined) {
    return [];
  }
  
  // If it's already an array, return it
  if (Array.isArray(jsonString)) {
    return jsonString;
  }
  
  // Convert to string and trim whitespace
  const str = String(jsonString).trim();
  
  // Handle empty string or string "null"
  if (str === '' || str === 'null' || str === 'undefined') {
    return [];
  }
  
  try {
    const parsed = JSON.parse(str);
    // Ensure the result is an array
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse JSON:', str, error);
    return [];
  }
};

// Helper function to safely parse land details JSON
const safeLandDetailsParse = (jsonString: any): LandDetail | undefined => {
  // Handle null, undefined, or empty values
  if (!jsonString || jsonString === null || jsonString === undefined) {
    return undefined;
  }
  
  // If it's already an object with area property
  if (typeof jsonString === 'object' && jsonString.area !== undefined) {
    return {
      area: Number(jsonString.area) || 0,
      khasraNumber: jsonString.khasraNumber || undefined
    };
  }
  
  // Convert to string and trim whitespace
  const str = String(jsonString).trim();
  
  // Handle empty string or string "null"
  if (str === '' || str === 'null' || str === 'undefined') {
    return undefined;
  }
  
  try {
    const parsed = JSON.parse(str);
    return {
      area: Number(parsed.area) || 0,
      khasraNumber: parsed.khasraNumber || undefined
    };
  } catch (error) {
    console.warn('Failed to parse land details JSON:', str, error);
    return undefined;
  }
};

// Convert database row to ShareholderProps
function dbRowToShareholderProps(data: any): ShareholderProps {
  return {
    id: data.id,
    fpoId: data.fpo_id,
    name: data.name,
    fatherName: data.father_name,
    mobile: data.mobile,
    aadhaar: data.aadhaar,
    gender: data.gender,
    socialCategory: data.social_category,
    landDetails: safeLandDetailsParse(data.land_details),
    shareAlloted: data.share_alloted,
    faceValue: data.face_value,
    totalPaid: data.total_paid,
    isDirector: data.is_director,
    pondDetails: safeJsonParse(data.pond_details),
    cattleDetails: safeJsonParse(data.cattle_details),
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
}

export async function createShareholder(shareholder: ShareholderProps): Promise<Shareholder | null> {
  const supabase = await createClient()
  const shareholderData = new Shareholder(shareholder)
  console.log("share holder data giving to tojson format ",shareholderData)
  const shareholderDataParsed = shareholderData.toJSON()
  
  try {
    const { data, error } = await supabase
      .from('shareholders')
      .insert([shareholderDataParsed])
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return new Shareholder(dbRowToShareholderProps(data))
  } catch (error) {
    console.error('Error creating shareholder:', error)
    return null
  }
}

export async function updateShareholder(id: string, shareholder: Partial<ShareholderProps>): Promise<Shareholder | null> {
  const supabase = await createClient()
  
  // Convert camelCase to snake_case for database
  const updateData: any = {}
  if (shareholder.fpoId !== undefined) updateData.fpo_id = shareholder.fpoId
  if (shareholder.name !== undefined) updateData.name = shareholder.name
  if (shareholder.fatherName !== undefined) updateData.father_name = shareholder.fatherName
  if (shareholder.mobile !== undefined) updateData.mobile = shareholder.mobile
  if (shareholder.aadhaar !== undefined) updateData.aadhaar = shareholder.aadhaar
  if (shareholder.gender !== undefined) updateData.gender = shareholder.gender
  if (shareholder.socialCategory !== undefined) updateData.social_category = shareholder.socialCategory
  if (shareholder.landDetails !== undefined) updateData.land_details = shareholder.landDetails ? JSON.stringify(shareholder.landDetails) : null
  if (shareholder.shareAlloted !== undefined) updateData.share_alloted = shareholder.shareAlloted
  if (shareholder.faceValue !== undefined) updateData.face_value = shareholder.faceValue
  if (shareholder.totalPaid !== undefined) updateData.total_paid = shareholder.totalPaid
  if (shareholder.isDirector !== undefined) updateData.is_director = shareholder.isDirector
  if (shareholder.pondDetails !== undefined) updateData.pond_details = JSON.stringify(shareholder.pondDetails)
  if (shareholder.cattleDetails !== undefined) updateData.cattle_details = JSON.stringify(shareholder.cattleDetails)
  
  try {
    const { data, error } = await supabase
      .from('shareholders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return new Shareholder(dbRowToShareholderProps(data))
  } catch (error) {
    console.error('Error updating shareholder:', error)
    return null
  }
}

export async function upsertShareholder(shareholder: ShareholderProps): Promise<Shareholder | null> {
  const supabase = await createClient()
  
  try {
    // Get the current user's FPO ID
    const user = await supabase.auth.getUser();
    const fpo_id = user.data.user?.id;
    
    if (!fpo_id) {
      throw new Error('User not authenticated')
    }

    // Create shareholder instance and convert to database format
    const shareholderData = new Shareholder({ ...shareholder, fpoId: fpo_id })
    const shareholderDataParsed = shareholderData.toJSON()

    const { data, error } = await supabase
      .from('shareholders')
      .upsert([shareholderDataParsed], { 
        onConflict: shareholder.id ? 'id' : undefined 
      })
      .select()
      .single()

    if (error) {
      console.log(error)
    }

    return new Shareholder(dbRowToShareholderProps(data))
  } catch (error) {
    console.error('Error upserting shareholder:', error)
    return null
  }
}

export async function getAllShareholders(): Promise<Shareholder[] | null> {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    const fpo_id = user.data.user?.id;

    if (!fpo_id) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('shareholders')
      .select('*')
      .eq('fpo_id', fpo_id)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
  } catch (error) {
    console.error('Error fetching shareholders:', error)
    return null
  }
}

export async function getShareholderById(id: string): Promise<Shareholder | null> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('shareholders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    console.log(data ? new Shareholder(dbRowToShareholderProps(data)):null)
    return data ? new Shareholder(dbRowToShareholderProps(data)) : null
  } catch (error) {
    console.error('Error fetching shareholder by ID:', error)
    return null
  }
}

export async function getShareholdersByFpoId(): Promise<Shareholder[] | null> {
  const supabase = await createClient()
  const {data} = await supabase.auth.getUser()
  const fpoId = data.user?.id
  try {
    const { data, error } = await supabase
      .from('shareholders')
      .select('*')
      .eq('fpo_id', fpoId)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
  } catch (error) {
    console.error('Error fetching shareholders by FPO ID:', error)
    return null
  }
}

export async function deleteShareholder(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('shareholders')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error('Error deleting shareholder:', error)
    return false
  }
}

// Bulk operations for Excel upload
export async function bulkUpsertShareholders(shareholders: ShareholderProps[]): Promise<{
  success: Shareholder[];
  failed: { data: ShareholderProps; error: string }[];
}> {
  const supabase = await createClient()
  const success: Shareholder[] = []
  const failed: { data: ShareholderProps; error: string }[] = []

  // Get current user's FPO ID
  const user = await supabase.auth.getUser();
  const fpo_id = user.data.user?.id;
  
  if (!fpo_id) {
    throw new Error('User not authenticated')
  }

  // Process in batches to avoid overwhelming the database
  const batchSize = 100
  const batches = []
  
  for (let i = 0; i < shareholders.length; i += batchSize) {
    batches.push(shareholders.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    try {
      const shareholderDataArray = batch.map(s => {
        const shareholder = new Shareholder({ ...s, fpoId: fpo_id })
        return shareholder.toJSON()
      })
      
      const { data, error } = await supabase
        .from('shareholders')
        .upsert(shareholderDataArray, { 
          onConflict: 'aadhaar,fpo_id',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        // If batch fails, try individual upserts to identify specific failures
        for (const shareholder of batch) {
          try {
            const result = await upsertShareholder(shareholder)
            if (result) {
              success.push(result)
            } else {
              failed.push({ data: shareholder, error: 'Unknown error during upsert' })
            }
          } catch (individualError) {
            failed.push({ 
              data: shareholder, 
              error: individualError instanceof Error ? individualError.message : 'Unknown error' 
            })
          }
        }
      } else {
        // Batch succeeded
        success.push(...data.map(row => new Shareholder(dbRowToShareholderProps(row))))
      }
    } catch (batchError) {
      // Handle batch-level errors
      batch.forEach(shareholder => {
        failed.push({ 
          data: shareholder, 
          error: batchError instanceof Error ? batchError.message : 'Batch processing error' 
        })
      })
    }
  }

  return { success, failed }
}

export async function validateShareholdersBeforeUpsert(shareholders: ShareholderProps[]): Promise<{
  valid: ShareholderProps[];
  invalid: { data: ShareholderProps; errors: string[] }[];
}> {
  const valid: ShareholderProps[] = []
  const invalid: { data: ShareholderProps; errors: string[] }[] = []

  for (const shareholderData of shareholders) {
    const shareholder = new Shareholder(shareholderData)
    const validation = shareholder.validate()
    
    if (validation.isValid) {
      valid.push(shareholderData)
    } else {
      invalid.push({ data: shareholderData, errors: validation.errors })
    }
  }

  return { valid, invalid }
}

export async function getExistingShareholders(aadhaarNumbers: string[], fpoId?: string): Promise<Shareholder[]> {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('shareholders')
      .select('*')
      .in('aadhaar', aadhaarNumbers)

    if (fpoId) {
      query = query.eq('fpo_id', fpoId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
  } catch (error) {
    console.error('Error fetching existing shareholders:', error)
    return []
  }
}

// Utility functions for filtering shareholders by type
export async function getShareholdersWithLand(fpoId?: string): Promise<Shareholder[]> {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('shareholders')
      .select('*')
      .not('land_details', 'is', null)

    if (fpoId) {
      query = query.eq('fpo_id', fpoId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // Filter out shareholders with land area > 0
    const shareholders = data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
    return shareholders.filter(s => s.landDetails && s.landDetails.area > 0)
  } catch (error) {
    console.error('Error fetching shareholders with land:', error)
    return []
  }
}

export async function getShareholdersWithPonds(fpoId?: string): Promise<Shareholder[]> {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('shareholders')
      .select('*')
      .not('pond_details', 'eq', '[]')
      .not('pond_details', 'is', null)

    if (fpoId) {
      query = query.eq('fpo_id', fpoId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
  } catch (error) {
    console.error('Error fetching shareholders with ponds:', error)
    return []
  }
}

export async function getShareholdersWithCattle(fpoId?: string): Promise<Shareholder[]> {
  const supabase = await createClient()
  
  try {
    let query = supabase
      .from('shareholders')
      .select('*')
      .not('cattle_details', 'eq', '[]')
      .not('cattle_details', 'is', null)

    if (fpoId) {
      query = query.eq('fpo_id', fpoId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data ? data.map(row => new Shareholder(dbRowToShareholderProps(row))) : []
  } catch (error) {
    console.error('Error fetching shareholders with cattle:', error)
    return []
  }
}

// Get shareholders by type
export async function getShareholdersByType(type: 'land' | 'pond' | 'cattle', fpoId?: string): Promise<Shareholder[]> {
  switch (type) {
    case 'land':
      return getShareholdersWithLand(fpoId)
    case 'pond':
      return getShareholdersWithPonds(fpoId)
    case 'cattle':
      return getShareholdersWithCattle(fpoId)
    default:
      return []
  }
}