import { createClient } from '@/utils/supabase/server';

export interface UserContext {
  fpoId: string;
  email: string | undefined;
  fpoName: string | null; // 👈 add this
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
    
      
  return {
    fpoId: user.id,
    email: user.email,
    fpoName: data.company_name || user.user_metadata?.FPOname || null, // ✅ pick from metadata
  };
}
