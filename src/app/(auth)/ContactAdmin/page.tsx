"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  MessageSquare, 
  UserPlus,
  Shield,
  CheckCircle
} from "lucide-react"

export default function ContactAdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium">
              <UserPlus className="w-4 h-4 mr-2" />
              Account Creation Request
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">
            Contact Administrator
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            To create a new account on our platform, please contact our administrator using the information below. 
            All account requests are reviewed for security and compliance.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Information Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Shield className="w-6 h-6 mr-2 text-blue-600" />
                Administrator Contact
              </CardTitle>
              <CardDescription>
                Get in touch with our system administrator for account creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email */}
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Email</h3>
                  <p className="text-slate-600">kisaansetu@sukrshinfotech.com</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('mailto:kisaansetu@sukrshinfotech.com?subject=New Account Request - Kisaan Setu Platform')}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Phone */}
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Phone</h3>
                  <p className="text-slate-600">+91 78200 38781</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('tel:+917820038781')}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </div>
              </div>

              <Separator />

              {/* WhatsApp */}
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">WhatsApp</h3>
                  <p className="text-slate-600">+91 78200 38781</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => window.open('https://wa.me/917820038781?text=Hi, I would like to request a new account for Kisaan Setu platform.')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Office Address */}
              {/* <div className="flex items-start space-x-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Office Address</h3>
                  <p className="text-slate-600">
                    sukrsh infotech<br />
                    Regd, Off <br />
                    45/A FRIENDS COLONY ETAWAH<br />
                    Uttar Pradesh 206001, India
                  </p>
                </div>
              </div>

              <Separator /> */}

              {/* Office Hours */}
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">Office Hours</h3>
                  <div className="text-slate-600 space-y-1">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p>Saturday: 9:00 AM - 2:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
                Account Request Process
              </CardTitle>
              <CardDescription>
                Follow these steps to request your new account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Contact Administrator</h3>
                  <p className="text-slate-600 text-sm">
                    Reach out using any of the contact methods provided. Email is preferred for documentation.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Provide Required Information</h3>
                  <p className="text-slate-600 text-sm">
                    Share your full name, organization details, intended use case, and contact information.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Verification Process</h3>
                  <p className="text-slate-600 text-sm">
                    The administrator will verify your information and may ask for additional documentation.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Account Creation</h3>
                  <p className="text-slate-600 text-sm">
                    Once approved, your account will be created and login credentials will be shared securely.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Required Information */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-3">Required Information:</h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Full Name and Job Title
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Organization/Company Name
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Contact Information
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Purpose of Platform Usage
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    Valid ID Proof (if requested)
                  </li>
                </ul>
              </div>

              {/* Response Time */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-900 mb-2">Expected Response Time:</h4>
                <p className="text-sm text-slate-600">
                  Account requests are typically processed within 2-3 business days. 
                  You will receive a confirmation email once your account is ready.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg" 
            className="px-8"
            onClick={() => window.open('mailto:admin@kisaansetu.com?subject=New Account Request - Kisaan Setu Platform&body=Dear Administrator,%0A%0AI would like to request a new account for the Kisaan Setu platform.%0A%0AMy Details:%0AName: [Your Full Name]%0AOrganization: [Your Organization]%0AJob Title: [Your Position]%0APhone: [Your Phone Number]%0APurpose: [Why you need access]%0A%0AThank you for your consideration.%0A%0ABest regards')}
          >
            <Mail className="w-5 h-5 mr-2" />
            Send Account Request Email
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.open('https://wa.me/919876543210?text=Hi, I would like to request a new account for Kisaan Setu platform. Could you please guide me through the process?')}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            WhatsApp Admin
          </Button>
        </div>
      </div>
    </div>
  )
}