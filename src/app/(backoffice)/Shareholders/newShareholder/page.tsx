"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Upload } from "lucide-react";
import ExcelJS from "exceljs";
import { useUserDetails } from "@/contexts/UserDetailsContext";
import { toast } from 'react-toastify';

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

export default function AddNewShareholderPage() {
  const router = useRouter();
  const { profile, loading } = useUserDetails();

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

  const [bulkData, setBulkData] = useState<Shareholder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? Number(value) : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSelectChange = (name: keyof Shareholder, value: any) => {
    setForm({ ...form, [name]: value });
  };

const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    const rows: Shareholder[] = [];

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString() || '';
    });

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      
      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });

      // Helper function to safely convert to string
      const toString = (value: any): string => {
        if (value === null || value === undefined) return '';
        return String(value);
      };

      // Helper function to safely convert to number
      const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      };

      // Helper function to safely convert to boolean
      const toBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === 'yes' || lower === '1';
        }
        if (typeof value === 'number') return value !== 0;
        return false;
      };

      // Map to expected format with proper type conversion
      const shareholder: Shareholder = {
        name: toString(rowData.name),
        fatherName: toString(rowData.fatherName),
        mobile: toString(rowData.mobile), // Convert to string to handle numbers
        aadhaar: toString(rowData.aadhaar), // Convert to string to handle numbers
        gender: (toString(rowData.gender) || 'male') as "male" | "female" | "other",
        socialCategory: (toString(rowData.socialCategory) || 'General') as "General" | "SC" | "ST" | "OBC",
        landDetails: toString(rowData.landDetails),
        khasraNo: toString(rowData.khasraNo),
        shareAlloted: toNumber(rowData.shareAlloted),
        faceValue: toNumber(rowData.faceValue) || 100,
        totalPaid: toNumber(rowData.totalPaid),
        isDirector: toBoolean(rowData.isDirector)
      };

      rows.push(shareholder);
    });

    setBulkData(rows);
    toast.success(`Excel file loaded successfully! Found ${rows.length} shareholders.`);
  } catch (error) {
    console.error('Error processing Excel file:', error);
    toast.error('Error processing Excel file. Please check the format.');
  }
};

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Shareholders");

    // Add headers
    sheet.addRow([
      "name", "fatherName", "mobile", "aadhaar", "gender", "socialCategory",
      "landDetails", "khasraNo", "shareAlloted", "faceValue", "totalPaid", "isDirector"
    ]);

    // Add sample data row
    sheet.addRow([
      "John Doe", "Robert Doe", "9876543210", "123456789012", "male", "General",
      "Village ABC, Plot 123", "K123", 10, 100, 500, false
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "shareholder-template.xlsx";
    link.click();
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
      const res = await fetch("/api/shareholder", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success("Shareholder saved successfully");
        // Reset form
        setForm({
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
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Error submitting form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkData.length === 0) {
      toast.warning("No data to submit");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/shareholder/bulk-upload", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareholders: bulkData }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success(`Bulk upload successful! Processed ${result.success?.length || 0} records successfully.`);
        if (result.failed?.length > 0) {
          toast.warning(`${result.failed.length} records failed. Check console for details.`);
          console.error('Failed records:', result.failed);
        }
        setBulkData([]);
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error with bulk upload:', error);
      toast.error('Error with bulk upload. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Button className="" variant={"secondary"} onClick={() => router.back()}>
        <ChevronLeft size={12}/> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add New Shareholder</CardTitle>
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

      <div className="flex flex-wrap items-center gap-4">
        <Button 
          disabled={loading || isSubmitting} 
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Shareholder'}
        </Button>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">or Upload Excel</Label>
          <Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="w-auto" />
        </div>
        <Button onClick={handleDownloadTemplate} variant="secondary">
          Download Excel Template
        </Button>
        {bulkData.length > 0 && (
          <>
            <span className="text-sm text-gray-600">
              {bulkData.length} records loaded
            </span>
            <Button 
              onClick={handleBulkSubmit} 
              variant="outline"
              disabled={isSubmitting}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Uploading...' : `Submit Bulk (${bulkData.length})`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}