import { createClient } from '@/utils/supabase/server';

export interface UserContext {
  fpoId: string;
  email: string | undefined;
  fpoName: string | null;
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("fpo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
    
  // Handle the case where data is null (no profile found)
  const companyName = data?.company_name || null;
  const fpoNameFromMetadata = user.user_metadata?.FPOname || null;
  
  return {
    fpoId: user.id,
    email: user.email,
    fpoName: companyName || fpoNameFromMetadata, // Use company_name first, fallback to FPOname
  };
}