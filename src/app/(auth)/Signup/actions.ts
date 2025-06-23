'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

interface SignupResult {
  error?: string;
  success?: boolean;
}

export async function signup(formData: FormData): Promise<SignupResult> {
  const supabase = await createClient();

  // Get form values
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const FPOname = formData.get('FPOname') as string;

  // Validation
  if (!email || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          FPOname,
          display_name: FPOname, // <-- This will show in the display_name column
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      }
    });

    if (error) {
      return { error: error.message };
    }

    // Check if email confirmation is required or if email is already registered
    if (data?.user?.identities?.length === 0) {
      return { error: "Email already registered" };
    }

  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }

  // Redirect outside of try-catch block
  redirect('/auth/confirmemail');
}