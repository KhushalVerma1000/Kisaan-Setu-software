"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { useRouter } from "next/navigation";
import { Search, FileDown, Plus, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import * as XLSX from 'xlsx';

interface Quotation {
  id: string;
  customerName: string;
  quotationNumber: string;
  amount: number;
  date: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  validUntil: string;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
};

export default function QuotationPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const sampleQuotations: Quotation[] = [
    { id: "1", customerName: "ABC Farm Supplies", quotationNumber: "QUO-2024-001", amount: 15000, date: "2024-01-15", status: "Sent", validUntil: "2024-02-15" },
    { id: "2", customerName: "Green Valley Co-op", quotationNumber: "QUO-2024-002", amount: 25000, date: "2024-01-20", status: "Draft", validUntil: "2024-02-20" },
    { id: "3", customerName: "Farmers United Ltd", quotationNumber: "QUO-2024-003", amount: 8500, date: "2024-01-25", status: "Accepted", validUntil: "2024-02-25" },
    { id: "4", customerName: "Rural Supply Chain", quotationNumber: "QUO-2024-004", amount: 32000, date: "2024-01-30", status: "Rejected", validUntil: "2024-03-01" },
    { id: "5", customerName: "Agro Mart Express", quotationNumber: "QUO-2024-005", amount: 18750, date: "2024-02-05", status: "Expired", validUntil: "2024-03-05" },
  ];

  const handleAddNewQuotation = useCallback(() => {
    router.push('/dashboard/quotations/new');
  }, [router]);

  const handleExportExcel = useCallback(() => {
    setIsLoading(true);
    try {
      const dataToExport = quotations.length > 0 ? quotations : sampleQuotations;
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport.map(q => ({
        'Quotation Number': q.quotationNumber,
        'Customer Name': q.customerName,
        'Amount (₹)': q.amount,
        'Date': formatDate(q.date),
        'Valid Until': formatDate(q.validUntil),
        'Status': q.status
      })));
      ws['!cols'] = [{ width: 20 }, { width: 25 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "Quotations");
      const fileName = `quotations_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsLoading(false);
    }
  }, [quotations]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (value.trim()) {
      setQuotations(sampleQuotations.filter(q =>
        q.customerName.toLowerCase().includes(value.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(value.toLowerCase()) ||
        q.status.toLowerCase().includes(value.toLowerCase())
      ));
    } else {
      setQuotations(sampleQuotations);
    }
  }, []);

  const loadQuotations = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(res => setTimeout(res, 500));
      setQuotations(sampleQuotations);
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const headerButtons = useMemo(() => [
    { label: "Add New Quotation", onClick: handleAddNewQuotation },
    { label: isLoading ? "Exporting..." : "Export Excel", onClick: handleExportExcel },
  ], [handleAddNewQuotation, handleExportExcel, isLoading]);

  useHeaderButtons(headerButtons);

  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(quotations.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentQuotations = quotations.slice(startIndex, endIndex);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quotation #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Valid Until</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentQuotations.map((q) => (
            <TableRow key={q.id}>
              <TableCell>{q.quotationNumber}</TableCell>
              <TableCell>{q.customerName}</TableCell>
              <TableCell>₹{q.amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>{formatDate(q.date)}</TableCell>
              <TableCell>{formatDate(q.validUntil)}</TableCell>
              <TableCell><Badge>{q.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
