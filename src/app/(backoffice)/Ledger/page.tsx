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
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal, FileSpreadsheet, ChevronDown } from "lucide-react";

// Ledger data structure
interface Ledger {
  id: string;
  name: string;
  groupName: string;
  openingBalance: number;
  balanceType: 'Dr' | 'Cr';
  contactInfo?: string;
  address?: string;
}

// Group data structure
interface Group {
  id: string;
  name: string;
}

export default function LedgerPage() {
  const router = useRouter();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLedgers, setSelectedLedgers] = useState<string[]>([]);
  
  // Filter states
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  // Sample data
  const sampleGroups: Group[] = [
    { id: "1", name: "Sundry Debtors" },
    { id: "2", name: "Sundry Creditors" },
    { id: "3", name: "Bank Accounts" },
    { id: "4", name: "Cash in Hand" },
    { id: "5", name: "Fixed Assets" }
  ];

  const sampleLedgers: Ledger[] = [
    {
      id: "1",
      name: "Abhishek",
      groupName: "Sundry Debtors",
      openingBalance: 15000,
      balanceType: "Dr",
      contactInfo: "+91 9876543210",
      address: "Village Rajpur, Ghaziabad"
    },
    {
      id: "2",
      name: "Ajad",
      groupName: "Sundry Debtors",
      openingBalance: 8500,
      balanceType: "Dr",
      contactInfo: "+91 9876543211",
      address: "Village Muradnagar, Ghaziabad"
    },
    {
      id: "3",
      name: "Ajay",
      groupName: "Sundry Debtors",
      openingBalance: 12000,
      balanceType: "Dr",
      contactInfo: "+91 9876543212",
      address: "Village Pilkhuwa, Ghaziabad"
    },
    {
      id: "4",
      name: "Ajeet",
      groupName: "Sundry Debtors",
      openingBalance: 0,
      balanceType: "Dr",
      contactInfo: "+91 9876543213",
      address: "Village Dasna, Ghaziabad"
    },
    {
      id: "5",
      name: "Alok",
      groupName: "Sundry Debtors",
      openingBalance: 5500,
      balanceType: "Dr",
      contactInfo: "+91 9876543214",
      address: "Village Tronica City, Ghaziabad"
    },
    {
      id: "6",
      name: "Amar Rajput",
      groupName: "Sundry Debtors",
      openingBalance: 25000,
      balanceType: "Dr",
      contactInfo: "+91 9876543215",
      address: "Village Hapur, Ghaziabad"
    },
    {
      id: "7",
      name: "Amritlal",
      groupName: "Sundry Debtors",
      openingBalance: 3000,
      balanceType: "Dr",
      contactInfo: "+91 9876543216",
      address: "Village Loni, Ghaziabad"
    },
    {
      id: "8",
      name: "Anand",
      groupName: "Sundry Debtors",
      openingBalance: 18000,
      balanceType: "Dr",
      contactInfo: "+91 9876543217",
      address: "Village Sahibabad, Ghaziabad"
    }
  ];

  // Header button functionalities
  const handleAddNewLedger = useCallback(() => {
    console.log("Add Ledger clicked");
    router.push('/dashboard/ledger/new');
  }, [router]);

  const handleExportExcel = useCallback(() => {
    console.log("Export Excel clicked");
    // Export functionality would go here
  }, []);

  // Search and filter functionality
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSubmit = useCallback(() => {
    console.log("Apply filters:", {
      group: selectedGroup,
      search: searchTerm
    });
    
    setIsLoading(true);
    
    // Simulate API call with filters
    setTimeout(() => {
      let filtered = sampleLedgers;
      
      // Apply group filter
      if (selectedGroup && selectedGroup !== "all") {
        const group = sampleGroups.find(g => g.id === selectedGroup);
        if (group) {
          filtered = filtered.filter(ledger => ledger.groupName === group.name);
        }
      }
      
      // Apply search filter
      if (searchTerm.trim()) {
        filtered = filtered.filter(ledger =>
          ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ledger.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (ledger.contactInfo && ledger.contactInfo.includes(searchTerm)) ||
          (ledger.address && ledger.address.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setLedgers(filtered);
      setIsLoading(false);
    }, 500);
  }, [selectedGroup, searchTerm]);

  // Header buttons configuration
  const headerButtons = useMemo(() => [
    { 
      label: "Add Ledger", 
      onClick: handleAddNewLedger 
    },
    {
      label: "Export Excel",
      onClick: handleExportExcel
    }
  ], [handleAddNewLedger, handleExportExcel]);

  useHeaderButtons(headerButtons);

  // Pagination logic
  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(ledgers.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const currentLedgers = ledgers.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLedgers(currentLedgers.map(ledger => ledger.id));
    } else {
      setSelectedLedgers([]);
    }
  };

  const handleSelectLedger = (ledgerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLedgers(prev => [...prev, ledgerId]);
    } else {
      setSelectedLedgers(prev => prev.filter(id => id !== ledgerId));
    }
  };

  // Delete ledger handler
  const handleDeleteLedger = (ledgerId: string) => {
    console.log('Delete ledger:', ledgerId);
    setLedgers(prev => prev.filter(l => l.id !== ledgerId));
    setSelectedLedgers(prev => prev.filter(id => id !== ledgerId));
  };

  // Bulk delete handler
  const handleBulkDelete = () => {
    console.log('Bulk delete ledgers:', selectedLedgers);
    setLedgers(prev => prev.filter(l => !selectedLedgers.includes(l.id)));
    setSelectedLedgers([]);
  };

  // Load initial data
  useEffect(() => {
    handleSubmit();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ledger List</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Group Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Group</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="--All Groups--" />
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">--All Groups--</SelectItem>
                  {sampleGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  className="pl-10" 
                  placeholder="Search ledgers..." 
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Loading..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">items/page</span>
          </div>
          
          {selectedLedgers.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedLedgers.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete {selectedLedgers.length} selected ledger(s).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading ledgers...</p>
            </div>
          ) : currentLedgers.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLedgers.length === currentLedgers.length && currentLedgers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentLedgers.map((ledger) => (
                      <TableRow key={ledger.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLedgers.includes(ledger.id)}
                            onCheckedChange={(checked) => handleSelectLedger(ledger.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {ledger.name}
                        </TableCell>
                        <TableCell>{ledger.groupName}</TableCell>
                        <TableCell>
                          {ledger.openingBalance === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>₹{ledger.openingBalance.toLocaleString('en-IN')}</span>
                              <Badge variant={ledger.balanceType === 'Dr' ? 'destructive' : 'default'} className="text-xs">
                                {ledger.balanceType}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{ledger.contactInfo || '-'}</TableCell>
                        <TableCell>{ledger.address || '-'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/ledger/${ledger.id}/entries`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Ledger Entries
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/dashboard/ledger/${ledger.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the ledger &quot;{ledger.name}&quot;.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLedger(ledger.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4 p-4">
                {currentLedgers.map((ledger) => (
                  <Card key={ledger.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedLedgers.includes(ledger.id)}
                            onCheckedChange={(checked) => handleSelectLedger(ledger.id, !!checked)}
                          />
                          <div>
                            <p className="font-medium text-primary">{ledger.name}</p>
                            <p className="text-sm text-muted-foreground">{ledger.groupName}</p>
                          </div>
                        </div>
                        {ledger.openingBalance > 0 && (
                          <Badge variant={ledger.balanceType === 'Dr' ? 'destructive' : 'default'}>
                            ₹{ledger.openingBalance.toLocaleString('en-IN')} {ledger.balanceType}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        {ledger.contactInfo && (
                          <div>
                            <span className="text-muted-foreground">Contact:</span>
                            <p>{ledger.contactInfo}</p>
                          </div>
                        )}
                        {ledger.address && (
                          <div>
                            <span className="text-muted-foreground">Address:</span>
                            <p>{ledger.address}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/ledger/${ledger.id}/entries`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Entries
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/ledger/${ledger.id}/edit`)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the ledger "{ledger.name}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteLedger(ledger.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="p-16 text-center">
              <div className="text-6xl text-gray-300 mb-4">📊</div>
              <h3 className="text-xl font-medium text-gray-500 mb-2">No Record Found!!</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedGroup ? 
                  "No ledgers found matching your filters" : 
                  "No ledgers available. Create your first ledger to get started."
                }
              </p>
              {!searchTerm && !selectedGroup && (
                <Button onClick={handleAddNewLedger}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ledger
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {ledgers.length > itemsPerPageNum && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, ledgers.length)} of {ledgers.length} results
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}