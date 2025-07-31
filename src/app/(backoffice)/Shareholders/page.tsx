"use client"
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Phone,
  UserCheck,
  Award,
  DollarSign,
  MapPin,
  IndianRupee,
  Waves,
  HeartPulse,
  Fish,
  TreePine,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from 'react-toastify';

interface PondDetail {
  size: number; // in hectares
  count: number; // number of ponds of this size
}

interface CattleDetail {
  type: string; // e.g., "Cow", "Buffalo", "Goat", "Sheep", etc.
  count: number; // number of cattle of this type
}

interface LandDetails {
  area: number; // in hectares
  khasraNumber: string;
}

interface Shareholder {
  id: string;
  fpoId: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails?: LandDetails;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  totalInvestment: number;
  remainingAmount: number;
  paymentPercentage: number;
  paymentStatus: string;
  isDirector: boolean;
  pondDetails: PondDetail[];
  cattleDetails: CattleDetail[];
  landArea: number;
  totalPondArea: number;
  totalPondCount: number;
  totalCattleCount: number;
  cattleByType: Record<string, number>;
  shareholderType: 'land' | 'pond' | 'cattle';
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper function to safely format currency
const formatCurrency = (amount: number | null | undefined): string => {
  const safeAmount = amount ?? 0;
  return `₹${safeAmount.toLocaleString("en-IN")}`;
};

// Helper function to safely get number value
const getSafeNumber = (value: number | null | undefined): number => {
  return value ?? 0;
};

const getShareHolders = async (): Promise<Shareholder[] | null> => {
  try {
    const res = await fetch('/api/shareholder');
    if (!res.ok) return null;

    const raw = await res.json();

    const result: Shareholder[] = raw.map((item: any) => ({
      id: item.id,
      fpoId: item.fpoId || item.fpo_id,
      name: item.name,
      fatherName: item.fatherName || item.father_name,
      mobile: item.mobile,
      aadhaar: item.aadhaar,
      gender: item.gender,
      socialCategory: item.socialCategory || item.social_category,
      landDetails: item.landDetails,
      shareAlloted: item.shareAlloted || item.share_alloted,
      faceValue: item.faceValue || item.face_value,
      totalPaid: item.totalPaid || item.total_paid,
      totalInvestment: item.totalInvestment || item.total_investment,
      remainingAmount: item.remainingAmount || item.remaining_amount,
      paymentPercentage: item.paymentPercentage || item.payment_percentage,
      paymentStatus: item.paymentStatus || item.payment_status,
      isDirector: item.isDirector || item.is_director,
      pondDetails: item.pondDetails || [],
      cattleDetails: item.cattleDetails || [],
      landArea: item.landArea || item.land_area || 0,
      totalPondArea: item.totalPondArea || item.total_pond_area || 0,
      totalPondCount: item.totalPondCount || item.total_pond_count || 0,
      totalCattleCount: item.totalCattleCount || item.total_cattle_count || 0,
      cattleByType: item.cattleByType || item.cattle_by_type || {},
      shareholderType: item.shareholderType || item.shareholder_type,
      createdAt: item.createdAt || item.created_at,
      updatedAt: item.updatedAt || item.updated_at,
    }));

    return result;
  } catch (error) {
    console.error("Error fetching shareholders:", error);
    return null;
  }
};

const deleteShareholder = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/shareholder', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete shareholder');
    }

    return true;
  } catch (error) {
    console.error('Error deleting shareholder:', error);
    throw error;
  }
};

const fetchShareHolderData = async (): Promise<Shareholder[] | null> => {
  const fetchedshareholders = await getShareHolders();
  return fetchedshareholders;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

// Component to display holding details based on type
const HoldingDetailsDisplay = ({ shareholder }: { shareholder: Shareholder }) => {
  const { shareholderType, landArea, landDetails, totalPondArea, totalPondCount, totalCattleCount, cattleByType } = shareholder;

  switch (shareholderType) {
    case 'land':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs">
                <TreePine className="w-3 h-3 text-green-600" />
                <span>{landArea}ha land</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="text-xs">Area: {landArea}ha</div>
                {landDetails?.khasraNumber && (
                  <div className="text-xs">Khasra: {landDetails.khasraNumber}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case 'pond':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs">
                <Waves className="w-3 h-3 text-blue-500" />
                <span>{totalPondCount} ponds ({totalPondArea}ha)</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="text-xs">Total ponds: {totalPondCount}</div>
                <div className="text-xs">Total area: {totalPondArea}ha</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case 'cattle':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs">
                <HeartPulse className="w-3 h-3 text-amber-600" />
                <span>{totalCattleCount} animals</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {Object.entries(cattleByType).map(([type, count]) => (
                  <div key={type} className="text-xs">
                    {count} {type}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    default:
      return <span className="text-muted-foreground text-xs">No holdings</span>;
  }
};

// Component to display payment status
const PaymentStatusBadge = ({ paymentStatus, paymentPercentage }: { paymentStatus: string; paymentPercentage: number }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partially paid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Badge variant="outline" className={getStatusColor(paymentStatus)}>
      {paymentStatus} ({paymentPercentage}%)
    </Badge>
  );
};

export default function ShareholderPage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadShareHolders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchShareHolderData();
        
        if (data && Array.isArray(data)) {
          setShareholders(data);
          console.log("Successfully loaded shareholders:", data);
        } else {
          console.warn("No data received from API");
          setShareholders([]);
        }
      } catch (error) {
        console.error("Error loading shareholders:", error);
        setError("Failed to load shareholders");
        setShareholders([]);
        toast.error("Failed to load shareholders");
      } finally {
        setLoading(false);
      }
    };

    loadShareHolders();
  }, []);

  const filtered = shareholders.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile?.includes(search) ||
    s.aadhaar?.includes(search)
  );

  // Calculate statistics
  const totalShares = shareholders.reduce((acc, s) => acc + getSafeNumber(s.shareAlloted), 0);
  const totalPaid = shareholders.reduce((acc, s) => acc + getSafeNumber(s.totalPaid), 0);
  const totalInvestment = shareholders.reduce((acc, s) => acc + getSafeNumber(s.totalInvestment), 0);
  const directorCount = shareholders.filter((s) => s.isDirector).length;
  
  // Statistics by holding type
  const landHolders = shareholders.filter(s => s.shareholderType === 'land');
  const pondHolders = shareholders.filter(s => s.shareholderType === 'pond');
  const cattleHolders = shareholders.filter(s => s.shareholderType === 'cattle');
  
  const totalLandArea = landHolders.reduce((acc, s) => acc + s.landArea, 0);
  const totalPondArea = pondHolders.reduce((acc, s) => acc + s.totalPondArea, 0);
  const totalPonds = pondHolders.reduce((acc, s) => acc + s.totalPondCount, 0);
  const totalCattle = cattleHolders.reduce((acc, s) => acc + s.totalCattleCount, 0);

  const handleEdit = (id: string) => {
    router.push(`/Shareholders/edit/${id}`);
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ id: '', name: '' });

  const handleDelete = async (id: string, name: string) => {
    setItemToDelete({ id, name });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleteDialogOpen(false);
    await performDelete(itemToDelete.id, itemToDelete.name);
    setItemToDelete({ id: '', name: '' });
  };

  const performDelete = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      
      await deleteShareholder(id);
      
      // Remove from local state
      setShareholders(prev => prev.filter(s => s.id !== id));
      
      toast.success(`${name} has been deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting shareholder:', error);
      toast.error(error.message || 'Failed to delete shareholder');
    } finally {
      setDeletingId(null);
    }
  };

  const refreshData = async () => {
    try {
      setLoading(true);
      const data = await fetchShareHolderData();
      if (data && Array.isArray(data)) {
        setShareholders(data);
        toast.success("Data refreshed successfully");
      }
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shareholders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refreshData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shareholders</h1>
          <p className="text-muted-foreground">Manage your shareholder members</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshData} variant="outline">
            Refresh
          </Button>
          <Button onClick={() => router.push('/Shareholders/newShareholder')}>
            <Plus className="mr-2 w-4 h-4" /> Add New
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{itemToDelete.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Statistics Cards */}
     {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Row 1 - Main Statistics */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Members</p>
                  <p className="text-2xl font-bold text-foreground">{shareholders.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Directors</p>
                  <p className="text-2xl font-bold text-foreground">{directorCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Award className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold text-foreground">{totalShares}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <IndianRupee className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 - Financial & Holdings Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Investment</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalInvestment)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <TreePine className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Land Holders</p>
                  <p className="text-2xl font-bold text-foreground">{landHolders.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalLandArea} hectares</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Waves className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pond Holders</p>
                  <p className="text-2xl font-bold text-foreground">{pondHolders.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalPonds} ponds total</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-full">
                  <HeartPulse className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cattle Holders</p>
                  <p className="text-2xl font-bold text-foreground">{cattleHolders.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalCattle} animals total</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Input
          placeholder="Search shareholders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-80"
        />
        <div className="flex gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            onClick={() => setView("grid")}
          >
            Grid
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            onClick={() => setView("table")}
          >
            Table
          </Button>
        </div>
      </div>

      {shareholders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shareholders found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first shareholder.
            </p>
            <Button onClick={() => router.push('/Shareholders/newShareholder')}>
              <Plus className="mr-2 w-4 h-4" /> Add New Shareholder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "table")}>
          <TabsContent value="grid">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => (
                <Card key={s.id} className="hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={s.avatar} />
                          <AvatarFallback>{getInitials(s.name || "")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{s.name || "Unknown"}</CardTitle>
                          <CardDescription className="text-sm">{s.fatherName || ""}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(s.id)}>
                            <Edit className="mr-2 w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deletingId === s.id}
                          >
                            <Trash2 className="mr-2 w-4 h-4" /> 
                            {deletingId === s.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {s.isDirector && <Badge>Director</Badge>}
                      <Badge variant="outline" className="capitalize">{s.shareholderType}</Badge>
                      <Badge variant="outline">{s.gender || "Unknown"}</Badge>
                      <Badge variant="outline">{s.socialCategory}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> {s.mobile || "Not provided"}
                    </div>
                    <div className="space-y-2">
                      <p>Shares: {getSafeNumber(s.shareAlloted)}</p>
                      <p>Investment: {formatCurrency(s.totalInvestment)}</p>
                      <p>Paid: {formatCurrency(s.totalPaid)}</p>
                      <p>Remaining: {formatCurrency(s.remainingAmount)}</p>
                    </div>
                    <div className="space-y-2 pt-2 border-t">
                      <PaymentStatusBadge 
                        paymentStatus={s.paymentStatus} 
                        paymentPercentage={s.paymentPercentage} 
                      />
                      <HoldingDetailsDisplay shareholder={s} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Investment</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Holdings</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{s.name || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{s.fatherName}</div>
                        </div>
                      </TableCell>
                      <TableCell>{s.mobile || "Not provided"}</TableCell>
                      <TableCell className="capitalize">
                        <Badge variant="outline">{s.shareholderType}</Badge>
                      </TableCell>
                      <TableCell>{getSafeNumber(s.shareAlloted)}</TableCell>
                      <TableCell>{formatCurrency(s.totalInvestment)}</TableCell>
                      <TableCell>{formatCurrency(s.totalPaid)}</TableCell>
                      <TableCell>
                        <PaymentStatusBadge 
                          paymentStatus={s.paymentStatus} 
                          paymentPercentage={s.paymentPercentage} 
                        />
                      </TableCell>
                      <TableCell>
                        <HoldingDetailsDisplay shareholder={s} />
                      </TableCell>
                      <TableCell>
                        {s.isDirector && <Badge variant="default">✔</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(s.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={deletingId === s.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {filtered.length === 0 && search && shareholders.length > 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground">
              No shareholders match your search criteria: &quot;{search}&quot;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}