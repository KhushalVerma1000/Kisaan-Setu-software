'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface LoginResult {
  error?: string
}

export async function login(formData: FormData): Promise<LoginResult | never> {
 const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Basic validation
  if (!email || !password) {
    return { error: "Email and password are required" }
  }
  
  // Attempt to sign in
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  // If there's an error, return it to the form
  if (error) {
    return { error: error.message }
  }
  
  // Update cache to reflect new auth state
  revalidatePath('/', 'layout')
  
  // If successful, redirect to dashboard
  redirect('/Dashboard')
}