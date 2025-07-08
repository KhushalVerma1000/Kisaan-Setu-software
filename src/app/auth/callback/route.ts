import { createClient } from '@/utils/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    const cookieStore = cookies()
    const supabase = await createClient()
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // Redirect to dashboard after successful confirmation
      return NextResponse.redirect(new URL('/Dashboard', requestUrl.origin))
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      // If there's an error, redirect to login
      return NextResponse.redirect(new URL('/Login', requestUrl.origin))
    }
  }
  
  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/Login', requestUrl.origin))
}