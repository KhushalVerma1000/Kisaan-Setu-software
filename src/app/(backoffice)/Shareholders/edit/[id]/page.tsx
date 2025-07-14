"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useUserDetails } from "@/contexts/UserDetailsContext";
import { toast } from 'react-toastify';
import { convertKeysToCamel } from "@/utils/caseConvertor";

interface Shareholder {
  id?: string;
  fpoId?: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails: string;
  khasraNo: string;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
}

export default function EditShareholderPage() {
  const router = useRouter();
  const params = useParams();

  const shareholderId = params.id as string;

  const [form, setForm] = useState<Shareholder>({
    name: "",
    fatherName: "",
    mobile: "",
    aadhaar: "",
    gender: "male",
    socialCategory: "General",
    landDetails: "",
    khasraNo: "",
    shareAlloted: 0,
    faceValue: 100,
    totalPaid: 0,
    isDirector: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch shareholder data on component mount
  useEffect(() => {
 
    
    const fetchShareholder = async () => {
      if (!shareholderId) {
        console.log("cannot find id")
        return};

      try {
        setIsLoading(true);
        const res = await fetch(`/api/shareholder/${shareholderId}`);
        
        if (res.ok) {
          const shareholdersnake = await res.json();
          const shareholder = convertKeysToCamel(shareholdersnake)
          console.log(shareholder)
          setForm(shareholder);
        } 
        else {
          const error = await res.json();
          toast.error(`Error: ${error.error || 'Failed to fetch shareholder'}`);
          // router.back();
        }
      } catch (error) {
        console.error('Error fetching shareholder:', error);
        toast.error('Error fetching shareholder data');
        // router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareholder();
  }, [shareholderId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? Number(value) : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSelectChange = (name: keyof Shareholder, value: any) => {
    setForm({ ...form, [name]: value });
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (!form.fatherName.trim()) {
      toast.error("Father's name is required");
      return false;
    }
    if (!form.mobile.match(/^[6-9]\d{9}$/)) {
      toast.error("Valid mobile number is required");
      return false;
    }
    if (!form.aadhaar.match(/^\d{12}$/)) {
      toast.error("Valid 12-digit Aadhaar number is required");
      return false;
    }
    if (!form.landDetails.trim()) {
      toast.error("Land details are required");
      return false;
    }
    if (!form.khasraNo.trim()) {
      toast.error("Khasra number is required");
      return false;
    }
    if (form.shareAlloted <= 0) {
      toast.error("Share alloted must be greater than 0");
      return false;
    }
    if (form.faceValue <= 0) {
      toast.error("Face value must be greater than 0");
      return false;
    }
    if (form.totalPaid < 0) {
      toast.error("Total paid cannot be negative");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shareholder', {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: shareholderId,
          ...form 
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success("Shareholder updated successfully");
        router.back();
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating shareholder:', error);
      toast.error('Error updating shareholder. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading shareholder data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button className="" variant={"secondary"} onClick={() => router.back()}>
        <ChevronLeft size={12}/> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Shareholder</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <Label>Father&apos;s Name *</Label>
              <Input name="fatherName" value={form.fatherName} onChange={handleChange} required />
            </div>
            <div>
              <Label>Mobile *</Label>
              <Input name="mobile" value={form.mobile} onChange={handleChange} placeholder="10-digit mobile number" required />
            </div>
            <div>
              <Label>Aadhaar *</Label>
              <Input name="aadhaar" value={form.aadhaar} onChange={handleChange} placeholder="12-digit Aadhaar number" required />
            </div>
            <div>
              <Label>Land Details *</Label>
              <Textarea name="landDetails" value={form.landDetails} onChange={handleChange} required />
            </div>
            <div>
              <Label>Khasra No *</Label>
              <Input name="khasraNo" value={form.khasraNo} onChange={handleChange} required />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => handleSelectChange("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Social Category</Label>
              <Select value={form.socialCategory} onValueChange={(v) => handleSelectChange("socialCategory", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="ST">ST</SelectItem>
                  <SelectItem value="OBC">OBC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shares Alloted *</Label>
              <Input name="shareAlloted" type="number" value={form.shareAlloted} onChange={handleChange} min="1" required />
            </div>
            <div>
              <Label>Face Value *</Label>
              <Input name="faceValue" type="number" value={form.faceValue} onChange={handleChange} min="1" required />
            </div>
            <div>
              <Label>Total Paid</Label>
              <Input name="totalPaid" type="number" value={form.totalPaid} onChange={handleChange} min="0" />
            </div>
            <div>
              <Label>Is Director</Label>
              <Select value={form.isDirector.toString()} onValueChange={(v) => handleSelectChange("isDirector", v === "true")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button 
          disabled={isSubmitting || isLoading} 
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Updating...' : 'Update Shareholder'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}