import { createClient } from "@/utils/supabase/client";
const supabase=  createClient()
export async function getCurrentUserDetails() {
 
  const { data } = await supabase.auth.getUser();
  return {
    id: data?.user?.id || null,
    fponame: data?.user?.user_metadata?.FPOname || null,
    email: data?.user?.email || null,
    // Add other user details as needed
  };
}