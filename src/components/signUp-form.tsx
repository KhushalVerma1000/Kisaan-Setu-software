'use client'
import { useState, FormEvent } from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from 'next/navigation'
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

// Type definitions for the action results
interface ActionResult {
  error?: string;
  success?: boolean;
}

// Props interface for the SignUpForm component
interface SignUpFormProps {
  className?: string;
  signUpAction: (formData: FormData) => Promise<ActionResult | undefined>;
  googleSignUpAction?: () => Promise<ActionResult | undefined>; // Made optional
}

export function SignUpForm({ className, signUpAction, googleSignUpAction }: SignUpFormProps) {
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false)
  const router = useRouter()
  
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const formData = new FormData(event.currentTarget)
      
      // Check if passwords match
      const password = formData.get('password') as string
      const confirmPassword = formData.get('confirmPassword') as string
      
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setIsLoading(false)
        return
      }
      
      const result = await signUpAction(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        router.push('/dashboard')
        router.refresh() // Refresh to update auth state
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  async function handleGoogleSignUp(): Promise<void> {
    if (!googleSignUpAction) {
      setError('Google sign-up is not available')
      return
    }
    
    setIsGoogleLoading(true)
    setError('')
    
    try {
      const result = await googleSignUpAction()
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        router.push('/dashboard')
        router.refresh() // Refresh to update auth state
      }
    } catch (error) {
      setError('An error occurred during Google sign up')
    } finally {
      setIsGoogleLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your information below to create your account
        </p>
      </div>
      <div className="grid gap-6">
        {/* <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignUp}
          disabled={isLoading || isGoogleLoading}
          className="flex items-center justify-center gap-2"
        >
          {isGoogleLoading ? (
            "Signing up..."
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" className="mr-2">
                <g transform="matrix(0.666667, 0, 0, 0.666667, 0, 0)">
                  <path d="M23.745,12.27 C23.745,11.48 23.675,10.73 23.555,10 L12.255,10 L12.255,14.51 L18.725,14.51 C18.435,16.04 17.585,17.33 16.325,18.21 L16.325,21.21 L20.185,21.21 C22.445,19.12 23.745,15.93 23.745,12.27 Z" fill="#4285F4" />
                  <path d="M12.255,24 C15.495,24 18.205,22.92 20.185,21.21 L16.325,18.21 C15.245,18.99 13.875,19.46 12.255,19.46 C9.125,19.46 6.475,17.33 5.525,14.5 L1.545,14.5 L1.545,17.59 C3.515,21.43 7.565,24 12.255,24 Z" fill="#34A853" />
                  <path d="M5.525,14.5 C5.275,13.77 5.145,13 5.145,12.2 C5.145,11.4 5.285,10.63 5.525,9.9 L5.525,6.81 L1.545,6.81 C0.725,8.46 0.255,10.27 0.255,12.2 C0.255,14.13 0.725,15.94 1.545,17.59 L5.525,14.5 Z" fill="#FBBC05" />
                  <path d="M12.255,4.94 C14.025,4.94 15.605,5.53 16.855,6.73 L20.275,3.34 C18.205,1.36 15.495,0.2 12.255,0.2 C7.565,0.2 3.515,2.77 1.545,6.61 L5.525,9.7 C6.475,6.87 9.125,4.94 12.255,4.94 Z" fill="#EA4335" />
                </g>
              </svg>
              Sign up with Google
            </>
          )}
        </Button>
         */}
        {/* <div className="flex items-center">
          <Separator className="flex-1" />
          <span className="mx-4 text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>
         */}
        <div className="grid gap-3 ">
          <div className="grid gap-2">
            <Label htmlFor="firstName">FPO Name</Label>
            <Input
              id="firstName"
              name="FPOname"
              type="text"
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
        
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
            disabled={isLoading || isGoogleLoading}
          />
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            disabled={isLoading || isGoogleLoading}
          />
          <p className="text-xs text-muted-foreground">
            Password must be at least 8 characters long
          </p>
        </div>
        
        <div className="grid gap-3">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            disabled={isLoading || isGoogleLoading}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox id="terms" name="terms" required />
          <label
            htmlFor="terms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to the{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </label>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
        
        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/Login" className="text-blue-600 hover:underline">
            Login
          </a>
        </div>
      </div>
    </form>
  )
}