'use client'
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/datepicker"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { createClient } from "@/utils/supabase/client" // browser client

export default function GeneralTab() {
  const [companyName, setCompanyName] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("Uttar Pradesh")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [gst, setGst] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [message, setMessage] = useState("")

  const handleSubmit = async () => {
    setMessage("Submitting...")

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setMessage("Not logged in")
      return
    }

    const res = await fetch("/api/fpo/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        company_name: companyName,
        owner_name: ownerName,
        address,
        city,
        state,
        phone_number: phone,
        invoice_email: email,
        gst_number: gst,
        incorporation_date: date?.toISOString()
      })
    })

    const result = await res.json()
    if (res.ok) {
      setMessage("✅ FPO Profile Saved Successfully!")
    } else {
      setMessage(`❌ Error: ${result.error}`)
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Company Name *</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Owner Name *</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div>
            <DatePicker date={date} setDate={setDate} label="Company Incorporation Date *" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>State *</Label>
            <Select value={state} onValueChange={setState}>
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
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Invoice Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>GST Number</Label>
            <Input value={gst} onChange={(e) => setGst(e.target.value)} />
          </div>
        </div>

        <div className="pt-6">
          <Button onClick={handleSubmit}>Save Profile</Button>
          {message && <p className="text-sm mt-2 text-muted-foreground">{message}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
