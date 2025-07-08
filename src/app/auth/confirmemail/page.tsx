import React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail, CheckCircle } from "lucide-react"

const ConfirmEmailPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Thank You!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your account has been created successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <Mail className="w-5 h-5" />
            <span className="font-medium">Check Your Email</span>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed">
            We&apos;ve sent you a confirmation email. Please click the link in your email to verify your account.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Next Step:</strong> After confirming your email, log in to access your dashboard.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Link href="/Login" className="w-full">
            <Button variant="default" className="w-full">
              Go to Login Page
            </Button>
          </Link>
          
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
          
          <p className="text-xs text-gray-500 text-center">
            Didn&apos;t receive an email? Check your spam folder or contact support.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ConfirmEmailPage