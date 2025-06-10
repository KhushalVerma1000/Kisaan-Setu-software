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
import * as XLSX from 'xlsx';

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
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = useCallback(() => {
    router.push("/dashboard/accounting/journal/add");
  }, [router]);

  const handleExport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { width: 20 }, { width: 20 }, { width: 40 }, { width: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Journal Vouchers");
    XLSX.writeFile(wb, `journal_vouchers_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [data]);

  const headerButtons = useMemo(() => [
    {
      label: "Add Journal Voucher",
      onClick: handleAdd,
    },
    {
      label: isLoading ? "Exporting..." : "Export Excel",
      onClick: handleExport,
    },
  ], [handleAdd, handleExport, isLoading]);

  useHeaderButtons(headerButtons);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/accounting">Accounting</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Journal Voucher</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From Date</label>
              <Popover open={showFromCalendar} onOpenChange={setShowFromCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      setShowFromCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To Date</label>
              <Popover open={showToCalendar} onOpenChange={setShowToCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      setToDate(date);
                      setShowToCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={() => {}} className="w-full">
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center gap-4">
        <div className="text-sm text-muted-foreground">25 items/page</div>
        <div className="w-full max-w-sm relative">
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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
