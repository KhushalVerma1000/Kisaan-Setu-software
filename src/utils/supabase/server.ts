// file: utils/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
// Import the specific type for the resolved cookies object
import { type ReadonlyRequestCookies } from 'next/headers'

// CORRECT: The function expects the resolved cookie object, so we type
// its parameter as `ReadonlyRequestCookies`.
export const createClient = (cookieStore: ReadonlyRequestCookies) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}