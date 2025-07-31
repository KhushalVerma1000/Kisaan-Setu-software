"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Upload } from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from 'react-toastify';
import { PersonalInfoForm } from '@/components/shareholders/forms/PersonalInfoForm';
import { ShareDetailsForm } from '@/components/shareholders/forms/ShareDetailsForm';
import { MemberHoldingsForm } from '@/components/shareholders/forms/MemberHoldingsForm';
import { CATTLE_TYPES } from '@/server/features/ShareHolder/core/entities/ShareHolder';
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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

export default function AddNewShareholderPage() {
  const router = useRouter();
  
  // Redux state
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);

  const fpoIdOfUser = user.fpoId;

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

  const [holdingType, setHoldingType] = useState<'land' | 'pond' | 'cattle' | null>(null);
  const [bulkData, setBulkData] = useState<Shareholder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if fpoId is available on component mount
  useEffect(() => {
    if (!fpoIdOfUser) {
      toast.error("FPO ID not found. Please ensure you are logged in properly.");
      router.back();
    }
  }, [fpoIdOfUser, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? Number(value) : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleSelectChange = (name: string, value: any) => {
    setForm({ ...form, [name]: value });
  };

  const handleHoldingTypeChange = (type: 'land' | 'pond' | 'cattle' | null) => {
    setHoldingType(type);
    
    // Clear all holding data when changing type
    setForm(prev => ({
      ...prev,
      landDetails: undefined,
      pondDetails: [],
      cattleDetails: []
    }));
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

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!fpoIdOfUser) {
      toast.error("FPO ID not available. Cannot process upload.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      const rows: Shareholder[] = [];

      // Process data rows (skip first 4 rows: main headers, sub headers, sample data, instructions)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= 4) return;
        
        const values = row.values as any[];
        
        const getCellValue = (index: number): any => values[index] || '';
        const toString = (value: any): string => {
          if (value === null || value === undefined) return '';
          return String(value).trim();
        };
        const toNumber = (value: any): number => {
          if (value === null || value === undefined || value === '') return 0;
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        };
        const toBoolean = (value: any): boolean => {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === 'yes' || lower === '1';
          }
          if (typeof value === 'number') return value !== 0;
          return false;
        };

        // Extract basic information
        const name = toString(getCellValue(1));
        const fatherName = toString(getCellValue(2));
        const mobile = toString(getCellValue(3));
        const aadhaar = toString(getCellValue(4));
        const gender = toString(getCellValue(5)) || 'male';
        const socialCategory = toString(getCellValue(6)) || 'General';
        const shareAlloted = toNumber(getCellValue(7));
        const faceValue = toNumber(getCellValue(8)) || 100;
        const totalPaid = toNumber(getCellValue(9));
        const isDirector = toBoolean(getCellValue(10));

        // Extract land details (if any)
        const landArea = toNumber(getCellValue(11));
        const landKhasra = toString(getCellValue(12));
        let landDetails: LandDetail | undefined = undefined;
        if (landArea > 0) {
          landDetails = {
            area: landArea,
            khasraNumber: landKhasra || undefined
          };
        }

        // Extract pond details
        const pondDetails: PondDetail[] = [];
        for (let i = 0; i < 3; i++) {
          const areaIndex = 13 + (i * 2);
          const khasraIndex = 14 + (i * 2);
          
          const area = toNumber(getCellValue(areaIndex));
          const khasraNumber = toString(getCellValue(khasraIndex));
          
          if (area > 0) {
            pondDetails.push({ 
              area, 
              khasraNumber: khasraNumber || undefined 
            });
          }
        }

        // Extract cattle details
        const cattleDetails: CattleDetail[] = [];
        for (let i = 0; i < 4; i++) {
          const typeIndex = 19 + (i * 2);
          const countIndex = 20 + (i * 2);
          
          const type = toString(getCellValue(typeIndex));
          const count = toNumber(getCellValue(countIndex));
          
          if (type && count > 0) {
            cattleDetails.push({ type, count });
          }
        }

        // Only add row if it has essential data
        if (name && fatherName && mobile && aadhaar) {
          const shareholder: Shareholder = {
            fpoId: fpoIdOfUser, // Add fpoId to each shareholder
            name,
            fatherName,
            mobile,
            aadhaar,
            gender: gender as "male" | "female" | "other",
            socialCategory: socialCategory as "General" | "SC" | "ST" | "OBC",
            landDetails,
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

    // Set column widths
    sheet.columns = [
      { width: 15 }, // A - name
      { width: 15 }, // B - fatherName
      { width: 12 }, // C - mobile
      { width: 15 }, // D - aadhaar
      { width: 10 }, // E - gender
      { width: 12 }, // F - socialCategory
      { width: 12 }, // G - shareAlloted
      { width: 10 }, // H - faceValue
      { width: 12 }, // I - totalPaid
      { width: 10 }, // J - isDirector
      { width: 12 }, // K - land_area
      { width: 12 }, // L - land_khasra
      { width: 12 }, // M - pond_area_1
      { width: 12 }, // N - pond_khasra_1
      { width: 12 }, // O - pond_area_2
      { width: 12 }, // P - pond_khasra_2
      { width: 12 }, // Q - pond_area_3
      { width: 12 }, // R - pond_khasra_3
      { width: 12 }, // S - cattle_type_1
      { width: 12 }, // T - cattle_count_1
      { width: 12 }, // U - cattle_type_2
      { width: 12 }, // V - cattle_count_2
      { width: 12 }, // W - cattle_type_3
      { width: 12 }, // X - cattle_count_3
      { width: 12 }, // Y - cattle_type_4
      { width: 12 }, // Z - cattle_count_4
    ];

    // Main headers row
    const mainHeaders = [
      "Personal Information", "", "", "", "", "",
      "Share Details", "", "", "",
      "Land Holdings", "",
      "Pond Holdings", "", "", "", "", "",
      "Cattle Holdings", "", "", "", "", "", "", ""
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
    sheet.mergeCells('A1:F1'); // Personal Information
    sheet.mergeCells('G1:J1'); // Share Details
    sheet.mergeCells('K1:L1'); // Land Holdings
    sheet.mergeCells('M1:R1'); // Pond Holdings
    sheet.mergeCells('S1:Z1'); // Cattle Holdings

    // Sub headers row
    const subHeaders = [
      "Name*", "Father Name*", "Mobile*", "Aadhaar*", "Gender", "Social Category",
      "Shares*", "Face Value*", "Total Paid", "Is Director",
      "Area (Ha)", "Khasra No",
      "Area 1 (Ha)", "Khasra 1", "Area 2 (Ha)", "Khasra 2", "Area 3 (Ha)", "Khasra 3",
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

    // Add sample data row
    const sampleData = [
      "John Doe", "Robert Doe", "9876543210", "123456789012", "male", "General",
      10, 100, 500, "false",
      2.5, "K123", // Land: 2.5 hectares, khasra K123
      "", "", 0.5, "P1", 1.0, "P2", // Pond: 0.5 ha (P1), 1.0 ha (P2)
      "", "", "", "", "Cow", 3, "Buffalo", 2 // Cattle: 3 cows, 2 buffalos
    ];
    
    const sampleRow = sheet.addRow(sampleData);
    
    // Style sample data
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

    // Add instructions row
    const instructionsData = [
      "Enter name", "Father's name", "10-digit number", "12-digit number", "male/female/other", "General/SC/ST/OBC",
      "Number of shares", "Price per share", "Amount paid", "true/false",
      "Hectares", "Survey number",
      "Hectares", "Survey number", "Hectares", "Survey number", "Hectares", "Survey number",
      "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number", "Cow/Buffalo/etc", "Number"
    ];
    
    const instructionRow = sheet.addRow(instructionsData);
    
    // Style instructions
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

    // Add data validation
    const cattleTypes = `"${CATTLE_TYPES.join(',')}"`;
    
    // Gender validation
    sheet.getColumn('E').eachCell((cell, rowNumber) => {
      if (rowNumber > 4) {
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
    sheet.getColumn('J').eachCell((cell, rowNumber) => {
      if (rowNumber > 4) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"true,false"']
        };
      }
    });

    // Cattle type validation
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
    if (!fpoIdOfUser) {
      toast.error("FPO ID not available. Cannot submit.");
      return false;
    }
    
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

    // Validate holdings based on selected type
    if (!holdingType) {
      toast.error("Please select a holding type (Land, Pond, or Cattle)");
      return false;
    }

    if (holdingType === 'land') {
      if (!form.landDetails || form.landDetails.area <= 0) {
        toast.error("Land area is required and must be greater than 0");
        return false;
      }
    }

    if (holdingType === 'pond') {
      if (form.pondDetails.length === 0) {
        toast.error("At least one pond detail is required");
        return false;
      }
      for (let i = 0; i < form.pondDetails.length; i++) {
        const pond = form.pondDetails[i];
        if (pond.area <= 0) {
          toast.error(`Pond ${i + 1}: Area must be greater than 0`);
          return false;
        }
      }
    }

    if (holdingType === 'cattle') {
      if (form.cattleDetails.length === 0) {
        toast.error("At least one cattle detail is required");
        return false;
      }
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
      // Include fpoId in the form data
      const formData = {
        ...form,
        fpoId: fpoIdOfUser
      };

      const res = await fetch("/api/shareholder", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
          shareAlloted: 0,
          faceValue: 100,
          totalPaid: 0,
          isDirector: false,
          pondDetails: [],
          cattleDetails: []
        });
        setHoldingType(null);
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

    if (!fpoIdOfUser) {
      toast.error("FPO ID not available. Cannot submit bulk data.");
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

  // Don't render the form if fpoId is not available
  if (!fpoIdOfUser) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="text-center">
          <p className="text-red-600">FPO ID not found. Please ensure you are logged in properly.</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
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
          <CardTitle>Personal Information</CardTitle>
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
        holdingType={holdingType}
        onHoldingTypeChange={handleHoldingTypeChange}
        landDetails={form.landDetails}
        pondDetails={form.pondDetails}
        cattleDetails={form.cattleDetails}
        onLandDetailsChange={handleLandDetailsChange}
        onPondDetailsChange={handlePondDetailsChange}
        onCattleDetailsChange={handleCattleDetailsChange}
      />

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