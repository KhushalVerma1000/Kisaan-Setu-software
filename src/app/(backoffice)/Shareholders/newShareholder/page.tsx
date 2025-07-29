"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Upload, Plus, Trash2, Fish, Heart } from "lucide-react";
import ExcelJS from "exceljs";
import { useUserDetails } from "@/contexts/UserDetailsContext";
import { toast } from 'react-toastify';
import { CATTLE_TYPES, GENDER_OPTIONS, SOCIAL_CATEGORIES } from '@/server/features/ShareHolder/core/entities/ShareHolder'; // Adjust the path as needed

interface PondDetail {
  size: number; // in hectares
  count: number; // number of ponds of this size
}

interface CattleDetail {
  type: string; // e.g., "Cow", "Buffalo", "Goat", "Sheep", etc.
  count: number; // number of cattle of this type
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
  landDetails: string;
  khasraNo: string;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
  pondDetails: PondDetail[];
  cattleDetails: CattleDetail[];
}


export default function AddNewShareholderPage() {
  const router = useRouter();

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

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      const rows: Shareholder[] = [];

      // Process data rows (skip first 4 rows: main headers, sub headers, sample data, instructions)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 4) return; // Skip header and instruction rows
        
        const values = row.values as any[];
        
        // Helper function to safely get cell value
        const getCellValue = (index: number): any => {
          return values[index] || '';
        };

        // Helper function to safely convert to string
        const toString = (value: any): string => {
          if (value === null || value === undefined) return '';
          return String(value).trim();
        };

        // Helper function to safely convert to number
        const toNumber = (value: any): number => {
          if (value === null || value === undefined || value === '') return 0;
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };

        // Helper function to safely convert to boolean
        const toBoolean = (value: any): boolean => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === 'yes' || lower === '1';
          }
          if (typeof value === 'number') return value !== 0;
          return false;
        };

        // Extract basic information (columns A-L)
        const name = toString(getCellValue(1));
        const fatherName = toString(getCellValue(2));
        const mobile = toString(getCellValue(3));
        const aadhaar = toString(getCellValue(4));
        const gender = toString(getCellValue(5)) || 'male';
        const socialCategory = toString(getCellValue(6)) || 'General';
        const landDetails = toString(getCellValue(7));
        const khasraNo = toString(getCellValue(8));
        const shareAlloted = toNumber(getCellValue(9));
        const faceValue = toNumber(getCellValue(10)) || 100;
        const totalPaid = toNumber(getCellValue(11));
        const isDirector = toBoolean(getCellValue(12));

        // Extract pond details (columns M-R: up to 3 pond entries)
        const pondDetails: PondDetail[] = [];
        for (let i = 0; i < 3; i++) {
          const sizeIndex = 13 + (i * 2); // M, O, Q
          const countIndex = 14 + (i * 2); // N, P, R
          
          const size = toNumber(getCellValue(sizeIndex));
          const count = toNumber(getCellValue(countIndex));
          
          if (size > 0 && count > 0) {
            pondDetails.push({ size, count });
          }
        }

        // Extract cattle details (columns S-Z: up to 4 cattle entries)
        const cattleDetails: CattleDetail[] = [];
        for (let i = 0; i < 4; i++) {
          const typeIndex = 19 + (i * 2); // S, U, W, Y
          const countIndex = 20 + (i * 2); // T, V, X, Z
          
          const type = toString(getCellValue(typeIndex));
          const count = toNumber(getCellValue(countIndex));
          
          if (type && count > 0) {
            cattleDetails.push({ type, count });
          }
        }

        // Only add row if it has essential data
        if (name && fatherName && mobile && aadhaar) {
          const shareholder: Shareholder = {
            name,
            fatherName,
            mobile,
            aadhaar,
            gender: gender as "male" | "female" | "other",
            socialCategory: socialCategory as "General" | "SC" | "ST" | "OBC",
            landDetails,
            khasraNo,
            shareAlloted,
            faceValue,
            totalPaid,
            isDirector,
            pondDetails,
            cattleDetails
          };

          rows.push(shareholder);
        }
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

    // Set column widths for better readability
    sheet.columns = [
      { width: 15 }, // A - name
      { width: 15 }, // B - fatherName
      { width: 12 }, // C - mobile
      { width: 15 }, // D - aadhaar
      { width: 10 }, // E - gender
      { width: 12 }, // F - socialCategory
      { width: 25 }, // G - landDetails
      { width: 12 }, // H - khasraNo
      { width: 12 }, // I - shareAlloted
      { width: 10 }, // J - faceValue
      { width: 12 }, // K - totalPaid
      { width: 10 }, // L - isDirector
      { width: 12 }, // M - pond_size_1
      { width: 12 }, // N - pond_count_1
      { width: 12 }, // O - pond_size_2
      { width: 12 }, // P - pond_count_2
      { width: 12 }, // Q - pond_size_3
      { width: 12 }, // R - pond_count_3
      { width: 12 }, // S - cattle_type_1
      { width: 12 }, // T - cattle_count_1
      { width: 12 }, // U - cattle_type_2
      { width: 12 }, // V - cattle_count_2
      { width: 12 }, // W - cattle_type_3
      { width: 12 }, // X - cattle_count_3
      { width: 12 }, // Y - cattle_type_4
      { width: 12 }, // Z - cattle_count_4
    ];

    // Main headers row (Row 1)
    const mainHeaders = [
      "Personal Information", "", "", "", "", "", "", "",
      "Share Details", "", "", "",
      "Pond Details", "", "", "", "", "",
      "Cattle Details", "", "", "", "", "", "", ""
    ];
    
    const mainHeaderRow = sheet.addRow(mainHeaders);
    
    // Style main headers
    mainHeaderRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Merge cells for main headers
    sheet.mergeCells('A1:H1'); // Personal Information
    sheet.mergeCells('I1:L1'); // Share Details
    sheet.mergeCells('M1:R1'); // Pond Details
    sheet.mergeCells('S1:Z1'); // Cattle Details

    // Sub headers row (Row 2)
    const subHeaders = [
      "Name*", "Father Name*", "Mobile*", "Aadhaar*", "Gender", "Social Category",
      "Land Details*", "Khasra No*", "Shares Alloted*", "Face Value*", "Total Paid", "Is Director",
      "Size 1 (Ha)", "Count 1", "Size 2 (Ha)", "Count 2", "Size 3 (Ha)", "Count 3",
      "Type 1", "Count 1", "Type 2", "Count 2", "Type 3", "Count 3", "Type 4", "Count 4"
    ];
    
    const subHeaderRow = sheet.addRow(subHeaders);
    
    // Style sub headers
    subHeaderRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD6EAF8' }
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add sample data row (Row 3)
    const sampleData = [
      "John Doe", "Robert Doe", "9876543210", "123456789012", "male", "General",
      "Village ABC, Plot 123", "K123", 10, 100, 500, "false",
      0.5, 2, 1.0, 1, "", "", // Pond details: 0.5 ha with 2 ponds, 1.0 ha with 1 pond
      "Cow", 3, "Buffalo", 2, "Goat", 5, "", "" // Cattle: 3 cows, 2 buffalos, 5 goats
    ];
    
    const sampleRow = sheet.addRow(sampleData);
    
    // Style sample data row
    sampleRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add instructions row (Row 4)
    const instructionsData = [
      "Enter farmer name", "Enter father's name", "10-digit number", "12-digit number", "male/female/other", "General/SC/ST/OBC",
      "Land description", "Survey number", "Number of shares", "Price per share", "Amount paid", "true/false",
      "Hectares", "Number", "Hectares", "Number", "Hectares", "Number",
      "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number"
    ];
    
    const instructionRow = sheet.addRow(instructionsData);
    
    // Style instructions row
    instructionRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      };
      cell.font = { italic: true, size: 9 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Set row heights
    sheet.getRow(1).height = 25;
    sheet.getRow(2).height = 35;
    sheet.getRow(3).height = 20;
    sheet.getRow(4).height = 30;

    // Add data validation for specific columns
    // Gender validation
    sheet.getColumn('E').eachCell((cell, rowNumber) => {
      if (rowNumber > 4) { // Skip header rows
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"male,female,other"']
        };
      }
    });

    // Social Category validation
    sheet.getColumn('F').eachCell((cell, rowNumber) => {
      if (rowNumber > 4) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"General,SC,ST,OBC"']
        };
      }
    });

    // Is Director validation
    sheet.getColumn('L').eachCell((cell, rowNumber) => {
      if (rowNumber > 4) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"true,false"']
        };
      }
    });

    // Cattle type validation for cattle type columns
    // const cattleTypes = '"Cow,Buffalo,Goat,Sheep,Ox,Bull,Calf,Other"';
const cattleTypes = `"${CATTLE_TYPES.join(',')}"`;
    ['S', 'U', 'W', 'Y'].forEach(col => {
      sheet.getColumn(col).eachCell((cell, rowNumber) => {
        if (rowNumber > 4) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [cattleTypes]
          };
        }
      });
    });

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
          isDirector: false,
          pondDetails: [],
          cattleDetails: []
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
                      value={pond.size}
                      onChange={(e) => updatePondDetail(index, 'size', Number(e.target.value))}
                      placeholder="e.g., 0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Number of Ponds</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pond.count}
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
                      value={cattle.count}
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

      {/* Submit and Bulk Upload Section */}
      <div className="flex flex-wrap items-center gap-4">
        <Button 
          disabled={isSubmitting} 
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