import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ShareDetailsFormProps {
  form: {
    shareAlloted: number;
    faceValue: number;
    totalPaid: number;
    isDirector: boolean;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: any) => void;
  disabled?: boolean;
}

export const ShareDetailsForm: React.FC<ShareDetailsFormProps> = ({
  form,
  onChange,
  onSelectChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Shares Alloted *</Label>
        <Input 
          name="shareAlloted" 
          type="number" 
          value={form.shareAlloted} 
          onChange={onChange} 
          min="1" 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Face Value *</Label>
        <Input 
          name="faceValue" 
          type="number" 
          value={form.faceValue} 
          onChange={onChange} 
          min="1" 
          disabled={disabled}
          required 
        />
      </div>
      
      <div>
        <Label>Total Paid</Label>
        <Input 
          name="totalPaid" 
          type="number" 
          value={form.totalPaid} 
          onChange={onChange} 
          min="0" 
          disabled={disabled}
        />
      </div>
      
      <div>
        <Label>Is Director</Label>
        <Select 
          value={form.isDirector.toString()} 
          onValueChange={(v) => onSelectChange("isDirector", v === "true")}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};