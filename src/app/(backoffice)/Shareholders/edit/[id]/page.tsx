"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import { PersonalInfoForm } from '@/components/shareholders/forms/PersonalInfoForm';
import { ShareDetailsForm } from '@/components/shareholders/forms/ShareDetailsForm';
import { MemberHoldingsForm } from '@/components/shareholders/forms/MemberHoldingsForm';

interface LandDetail {
  area: number;
  khasraNumber?: string;
}

interface PondDetail {
  area: number;
  khasraNumber?: string;
}

interface CattleDetail {
  type: string;
  count: number;
}

interface Shareholder {
  id?: string;
  fpoId?: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails?: LandDetail;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
  pondDetails: PondDetail[];
  cattleDetails: CattleDetail[];
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
    shareAlloted: 0,
    faceValue: 100,
    totalPaid: 0,
    isDirector: false,
    pondDetails: [],
    cattleDetails: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch shareholder data on component mount
  useEffect(() => {
    const fetchShareholder = async () => {
      if (!shareholderId) {
        console.log("cannot find id");
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch(`/api/shareholder/${shareholderId}`);
        
        if (res.ok) {
          const shareholder = await res.json();
          console.log('Fetched shareholder:', shareholder);
          
          // Ensure arrays are properly initialized
          const updatedShareholder = {
            ...shareholder,
            pondDetails: shareholder.pondDetails || [],
            cattleDetails: shareholder.cattleDetails || []
          };
          
          setForm(updatedShareholder);
        } 
        else {
          const error = await res.json();
          toast.error(`Error: ${error.error || 'Failed to fetch shareholder'}`);
        }
      } catch (error) {
        console.error('Error fetching shareholder:', error);
        toast.error('Error fetching shareholder data');
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

  const handleSelectChange = (name: string, value: any) => {
    setForm({ ...form, [name]: value });
  };

  const handleLandDetailsChange = (landDetails: LandDetail | undefined) => {
    setForm(prev => ({ ...prev, landDetails }));
  };

  const handlePondDetailsChange = (pondDetails: PondDetail[]) => {
    setForm(prev => ({ ...prev, pondDetails }));
  };

  const handleCattleDetailsChange = (cattleDetails: CattleDetail[]) => {
    setForm(prev => ({ ...prev, cattleDetails }));
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

    // Basic holdings validation - at least one type should have data
    const hasLand = form.landDetails && form.landDetails.area > 0;
    const hasPonds = form.pondDetails && form.pondDetails.length > 0;
    const hasCattle = form.cattleDetails && form.cattleDetails.length > 0;

    if (!hasLand && !hasPonds && !hasCattle) {
      toast.error("Please add at least one type of holding (Land, Pond, or Cattle)");
      return false;
    }

    // Validate pond details if present
    if (hasPonds) {
      for (let i = 0; i < form.pondDetails.length; i++) {
        const pond = form.pondDetails[i];
        if (pond.area <= 0) {
          toast.error(`Pond ${i + 1}: Area must be greater than 0`);
          return false;
        }
      }
    }

    // Validate cattle details if present
    if (hasCattle) {
      for (let i = 0; i < form.cattleDetails.length; i++) {
        const cattle = form.cattleDetails[i];
        if (!cattle.type.trim()) {
          toast.error(`Cattle ${i + 1}: Type is required`);
          return false;
        }
        if (cattle.count <= 0) {
          toast.error(`Cattle ${i + 1}: Count must be greater than 0`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shareholder/${shareholderId}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
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

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Shareholder - Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PersonalInfoForm
            form={{
              name: form.name,
              fatherName: form.fatherName,
              mobile: form.mobile,
              aadhaar: form.aadhaar,
              gender: form.gender,
              socialCategory: form.socialCategory
            }}
            onChange={handleChange}
            onSelectChange={handleSelectChange}
          />
          <ShareDetailsForm
            form={{
              shareAlloted: form.shareAlloted,
              faceValue: form.faceValue,
              totalPaid: form.totalPaid,
              isDirector: form.isDirector
            }}
            onChange={handleChange}
            onSelectChange={handleSelectChange}
          />
        </CardContent>
      </Card>

      {/* Member Holdings */}
      <MemberHoldingsForm
        holdingType={null} // Let component auto-detect
        onHoldingTypeChange={() => {}} // Component handles this internally
        landDetails={form.landDetails}
        pondDetails={form.pondDetails}
        cattleDetails={form.cattleDetails}
        onLandDetailsChange={handleLandDetailsChange}
        onPondDetailsChange={handlePondDetailsChange}
        onCattleDetailsChange={handleCattleDetailsChange}
        isEditMode={true}
      />

      {/* Submit Section */}
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