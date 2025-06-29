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
import { FpoProfile } from "@/server/features/fpo/core/entities/FpoProfile"

type ProfileForm = {
  companyName?: string;
   incorporationDate?: Date;
   logoUrl?: string;
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
  profile: FpoProfile | null;
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
  })

  // Optionally, populate from props/profile
  useEffect(() => {
    if (profile) {
    //  console.log(profile)
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
      })
    }
  }, [profile])

  const handleChange = (field: keyof ProfileForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
     onProfileChange(field, value);
    //  console.log("changong valeus from general tab", field, value)
   
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
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

        <div className="pt-6">
          <Button>Save Profile</Button>
          {/* {message && <p className="text-sm mt-2 text-muted-foreground">{message}</p>} */}
        </div>
      </CardContent>
    </Card>
  )
}
