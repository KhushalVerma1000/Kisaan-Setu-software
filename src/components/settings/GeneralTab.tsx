'use client'
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/datepicker"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { FrontendProfile } from "@/types/FrontendProfile"
import { Upload, X, Camera } from "lucide-react"

type ProfileForm = {
  companyName?: string;
  incorporationDate?: Date;
  logoUrl?: string;
  logoFile?: File | null;
  ceoName?: string;
  phoneNumber?: string;
  invoiceEmail?: string;
  gstNumber?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export default function GeneralTab({
  profile,
  onProfileChange,
}: {
  profile: FrontendProfile | null;
  onProfileChange: (field: keyof ProfileForm, value: any) => void;
}) {
  const [form, setForm] = useState<ProfileForm>({
    companyName: "",
    ceoName: "",
    addressLine1: "",
    city: "",
    state: "Uttar Pradesh",
    phoneNumber: "",
    invoiceEmail: "",
    gstNumber: "",
    incorporationDate: undefined,
    logoUrl: "",
  })

  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Populate form from profile
  useEffect(() => {
    if (profile) {
      setForm({
        companyName: profile.companyName || "",
        ceoName: profile.ceoName || "",
        addressLine1: profile.addressLine1 || "",
        city: profile.city || "",
        state: profile.state || "Uttar Pradesh",
        phoneNumber: profile.phoneNumber || "",
        invoiceEmail: profile.invoiceEmail || "",
        gstNumber: profile.gstNumber || "",
        incorporationDate: profile.incorporationDate ? new Date(profile.incorporationDate) : undefined,
        logoUrl: profile.logoUrl || "",
      })
    }
  }, [profile])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [previewUrl])

  const handleChange = (field: keyof ProfileForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    onProfileChange(field, value);
  }

  // Handle logo file selection
  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size must be less than 2MB.')
      return
    }

    setLogoFile(file)
    setUploadError(null)

    // Create preview URL
    const newPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(newPreviewUrl)
    
    // Notify parent about the logo file (for save operation)
    onProfileChange('logoFile', file)
  }

  // Remove logo
  const handleRemoveLogo = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null)
    }
    
    setForm(prev => ({ ...prev, logoUrl: "" }))
    onProfileChange('logoUrl', "")
    onProfileChange('logoFile', null)
    setLogoFile(null)
  }

  // Get display URL (preview or actual logo)
  const getDisplayUrl = () => {
    if (previewUrl) return previewUrl
    if (form.logoUrl) return form.logoUrl
    return null
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Company Logo</Label>
          
          {/* Logo Display */}
          <div className="flex items-start space-x-4">
            {getDisplayUrl() ? (
              <div className="relative">
                <img 
                  src={getDisplayUrl()!} 
                  alt="Company logo" 
                  className="w-20 h-20 object-contain border-2 border-gray-200 rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
            )}

            {/* Upload Controls */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Choose Logo</span>
                  </div>
                </Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
              </div>
              
              <p className="text-xs text-gray-500">
                JPEG, PNG, or WebP. Max 2MB. Recommended: 200x200px
                {logoFile && (
                  <span className="block text-blue-600 mt-1">
                    Logo will be uploaded when you save the profile
                  </span>
                )}
              </p>
              
              {uploadError && (
                <p className="text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rest of the form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Company Name *</Label>
            <Input value={form.companyName} onChange={e => handleChange("companyName", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Owner Name *</Label>
            <Input value={form.ceoName} onChange={e => handleChange("ceoName", e.target.value)} />
          </div>
          <div>
            <DatePicker date={form.incorporationDate} setDate={d => handleChange("incorporationDate", d)} label="Company Incorporation Date *" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Textarea value={form.addressLine1} onChange={e => handleChange("addressLine1", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={e => handleChange("city", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>State *</Label>
            <Select value={form.state} onValueChange={val => handleChange("state", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                <SelectItem value="Bihar">Bihar</SelectItem>
                <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Phone No</Label>
            <Input value={form.phoneNumber} onChange={e => handleChange("phoneNumber", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Invoice Email</Label>
            <Input value={form.invoiceEmail} onChange={e => handleChange("invoiceEmail", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>GST Number</Label>
            <Input value={form.gstNumber} onChange={e => handleChange("gstNumber", e.target.value)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}