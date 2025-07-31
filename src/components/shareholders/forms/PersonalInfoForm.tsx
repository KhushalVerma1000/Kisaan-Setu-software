import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GENDER_OPTIONS, SOCIAL_CATEGORIES } from '@/server/features/ShareHolder/core/entities/ShareHolder';

interface PersonalInfoFormProps {
  form: {
    name: string;
    fatherName: string;
    mobile: string;
    aadhaar: string;
    gender: "male" | "female" | "other";
    socialCategory: "General" | "SC" | "ST" | "OBC";
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: any) => void;
  disabled?: boolean;
}

export const PersonalInfoForm: React.FC<PersonalInfoFormProps> = ({
  form,
  onChange,
  onSelectChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Name *</Label>
        <Input 
          name="name" 
          value={form.name} 
          onChange={onChange} 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Father&apos;s Name *</Label>
        <Input 
          name="fatherName" 
          value={form.fatherName} 
          onChange={onChange} 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Mobile *</Label>
        <Input 
          name="mobile" 
          value={form.mobile} 
          onChange={onChange} 
          placeholder="10-digit mobile number" 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Aadhaar *</Label>
        <Input 
          name="aadhaar" 
          value={form.aadhaar} 
          onChange={onChange} 
          placeholder="12-digit Aadhaar number" 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Gender</Label>
        <Select 
          value={form.gender} 
          onValueChange={(v) => onSelectChange("gender", v)}
          disabled={disabled}
        >
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
        <Select 
          value={form.socialCategory} 
          onValueChange={(v) => onSelectChange("socialCategory", v)}
          disabled={disabled}
        >
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
    </div>
  );
};