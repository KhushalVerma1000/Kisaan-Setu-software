"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Plus, FileDown, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

// --- CHANGE 1: Imports are updated ---
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
// The import for 'xlsx' is removed.

interface JournalVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  narration: string;
  amount: number;
}

export default function JournalVoucherPage() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date(2025, 3, 1));
  const [toDate, setToDate] = useState<Date | undefined>(new Date(2026, 2, 31));
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<JournalVoucher[]>([]);
  // I've kept isLoading for good UX, but it doesn't change the page styling
  const [isLoading, setIsLoading] = useState(false); 

  const handleAdd = useCallback(() => {
    router.push("/dashboard/accounting/journal/add");
  }, [router]);

  // --- CHANGE 2: The handleExport function is replaced ---
  // This new version mimics the simple output of the old library without adding styles.
  const handleExport = useCallback(async () => {
    setIsLoading(true);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Journal Vouchers");

    // Get the headers from the keys of the first data object
    if (data.length > 0) {
      worksheet.columns = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter for header
        key: key,
      }));

      // Add the data rows
      worksheet.addRows(data);
    }

    try {
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `journal_vouchers_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error("Error generating Excel file:", error);
    } finally {
        setIsLoading(false);
    }
  }, [data]);

  const headerButtons = useMemo(() => [
    {
      label: "Add Journal Voucher",
      onClick: handleAdd,
    },
    {
      label: isLoading ? "Exporting..." : "Export Excel",
      onClick: handleExport,
      disabled: isLoading,
    },
  ], [handleAdd, handleExport, isLoading]);

  useHeaderButtons(headerButtons);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      // Reverted to your original data structure
      setData([
        {
          id: "1",
          voucherNumber: "JV-2025-001",
          date: "2025-04-05",
          narration: "Office Supplies Purchase",
          amount: 5000,
        },
        {
          id: "2",
          voucherNumber: "JV-2025-002",
          date: "2025-05-10",
          narration: "Salary Payment",
          amount: 20000,
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  const filteredData = data.filter(voucher => {
    const match =
      voucher.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.narration.toLowerCase().includes(searchTerm.toLowerCase());
    const voucherDate = new Date(voucher.date);
    return match && (!fromDate || voucherDate >= fromDate) && (!toDate || voucherDate <= toDate);
  });

  // --- NO OTHER CHANGES BELOW THIS LINE ---
  // The entire JSX for your page remains IDENTICAL to your original code.
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Breadcrumb>
        {/* ... */}
      </Breadcrumb>
      <Card>
        {/* ... */}
      </Card>
      {/* ... and so on, all JSX is unchanged ... */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading vouchers...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.voucherNumber}</TableCell>
                      <TableCell>{format(new Date(item.date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{item.narration}</TableCell>
                      <TableCell>₹{item.amount.toLocaleString("en-IN")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">📄</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400">Try adjusting your filters or add a new journal voucher.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
