"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, Plus, Trash2, Fish, Heart } from "lucide-react";
import { useUserDetails } from "@/contexts/UserDetailsContext";
import { toast } from 'react-toastify';
import { convertKeysToCamel } from "@/utils/caseConvertor";
// Import the constants from your ShareHolder class
import { 
  CATTLE_TYPES, 
  GENDER_OPTIONS, 
  SOCIAL_CATEGORIES,
  type PondDetail, 
  type CattleDetail 
} from "@/server/features/ShareHolder/core/entities/ShareHolder";

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
    landDetails: "",
    khasraNo: "",
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
          console.log(shareholder);
          
          // Ensure pondDetails and cattleDetails are arrays
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

  const handleSelectChange = (name: keyof Shareholder, value: any) => {
    setForm({ ...form, [name]: value });
  };

  // Pond Details Functions
  const addPondDetail = () => {
    setForm({
      ...form,
      pondDetails: [...form.pondDetails, { size: 0, count: 0 }]
    });
  };

  const updatePondDetail = (index: number, field: keyof PondDetail, value: number) => {
    const updatedPondDetails = [...form.pondDetails];
    updatedPondDetails[index] = { ...updatedPondDetails[index], [field]: value };
    setForm({ ...form, pondDetails: updatedPondDetails });
  };

  const removePondDetail = (index: number) => {
    const updatedPondDetails = form.pondDetails.filter((_, i) => i !== index);
    setForm({ ...form, pondDetails: updatedPondDetails });
  };

  // Cattle Details Functions
  const addCattleDetail = () => {
    setForm({
      ...form,
      cattleDetails: [...form.cattleDetails, { type: "", count: 0 }]
    });
  };

  const updateCattleDetail = (index: number, field: keyof CattleDetail, value: string | number) => {
    const updatedCattleDetails = [...form.cattleDetails];
    updatedCattleDetails[index] = { ...updatedCattleDetails[index], [field]: value };
    setForm({ ...form, cattleDetails: updatedCattleDetails });
  };

  const removeCattleDetail = (index: number) => {
    const updatedCattleDetails = form.cattleDetails.filter((_, i) => i !== index);
    setForm({ ...form, cattleDetails: updatedCattleDetails });
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

    // Validate pond details
    for (let i = 0; i < form.pondDetails.length; i++) {
      const pond = form.pondDetails[i];
      if (pond.size <= 0) {
        toast.error(`Pond ${i + 1}: Size must be greater than 0`);
        return false;
      }
      if (pond.count <= 0) {
        toast.error(`Pond ${i + 1}: Count must be greater than 0`);
        return false;
      }
    }

    // Validate cattle details
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

      <Card>
        <CardHeader>
          <CardTitle>Edit Shareholder</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
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
          
          {/* Share and Category Information */}
          <div className="space-y-4">
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => handleSelectChange("gender", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Social Category</Label>
              <Select value={form.socialCategory} onValueChange={(v) => handleSelectChange("socialCategory", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOCIAL_CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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

      {/* Pond Details Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Fish className="w-5 h-5" />
            Pond Details
          </CardTitle>
          <Button onClick={addPondDetail} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Pond
          </Button>
        </CardHeader>
        <CardContent>
          {form.pondDetails.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pond details added. Click "Add Pond" to get started.</p>
          ) : (
            <div className="space-y-3">
              {form.pondDetails.map((pond, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm">Size (Hectares)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={pond.size || ''}
                      onChange={(e) => updatePondDetail(index, 'size', Number(e.target.value))}
                      placeholder="e.g., 0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Number of Ponds</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pond.count || ''}
                      onChange={(e) => updatePondDetail(index, 'count', Number(e.target.value))}
                      placeholder="e.g., 2"
                    />
                  </div>
                  <Button
                    onClick={() => removePondDetail(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {form.pondDetails.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                  Total: {form.pondDetails.reduce((total, pond) => total + (pond.size * pond.count), 0).toFixed(2)} hectares 
                  ({form.pondDetails.reduce((total, pond) => total + pond.count, 0)} ponds)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cattle Details Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Cattle Details
          </CardTitle>
          <Button onClick={addCattleDetail} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Cattle
          </Button>
        </CardHeader>
        <CardContent>
          {form.cattleDetails.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No cattle details added. Click "Add Cattle" to get started.</p>
          ) : (
            <div className="space-y-3">
              {form.cattleDetails.map((cattle, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm">Cattle Type</Label>
                    <Select
                      value={cattle.type}
                      onValueChange={(value) => updateCattleDetail(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select cattle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATTLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Count</Label>
                    <Input
                      type="number"
                      min="1"
                      value={cattle.count || ''}
                      onChange={(e) => updateCattleDetail(index, 'count', Number(e.target.value))}
                      placeholder="e.g., 3"
                    />
                  </div>
                  <Button
                    onClick={() => removeCattleDetail(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {form.cattleDetails.length > 0 && (
                <div className="text-sm text-gray-600 mt-2">
                  Total cattle: {form.cattleDetails.reduce((total, cattle) => total + cattle.count, 0)}
                </div>
              )}
            </div>
          )}
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