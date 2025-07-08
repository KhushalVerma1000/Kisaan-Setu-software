"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package, Tag, Layers, Plus, Edit, Trash2, IndianRupee, MoveUpRight, 
  MoreHorizontal, Grid, List, Search, Filter, AlertTriangle, Settings,
  ShoppingCart, Wrench, TrendingUp, Package2, Zap, Star, Clock
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/hooks";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";

interface ItemLite {
  id: string;
  name: string;
  categoryName: string;
  salePrice: number;
  purchasePrice: number;
  type?: 'product' | 'service'; // Add type to interface
  lowStockAlert?: number;
  currentStock?: number;
  unit?: string;
  hsn_sac?: string;
}

type ItemFilter = 'all' | 'products' | 'services';

export default function ItemListPage() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const fpoId = user?.fpoId;

  const [allItems, setAllItems] = useState<ItemLite[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [page, setPage] = useState<number>(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const itemsPerPage = 20;

  const fetchItems = async () => {
    if (!fpoId) {
      setError("FPO ID is required");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(`/api/items?fpo_id=${fpoId}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      
      if (json.error) {
        throw new Error(json.error);
      }
      
      // Mock type assignment for demonstration - you'll need to update your API to return type
      const itemsWithType = (json.data || []).map((item: ItemLite) => ({
        ...item,
        type: item.purchasePrice > 0 ? 'product' : 'service' as 'product' | 'service',
        currentStock: Math.floor(Math.random() * 100), // Mock data
        unit: item.purchasePrice > 0 ? 'pcs' : undefined,
        lowStockAlert: item.purchasePrice > 0 ? 10 : undefined,
        hsn_sac: `${Math.floor(Math.random() * 90000000) + 10000000}` // Mock HSN/SAC
      }));
      
      setAllItems(itemsWithType);
      setPage(1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load items";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchItems(); 
  }, [fpoId]);

  // Filter items based on search and type filter
  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                         item.categoryName.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'products' && item.type === 'product') ||
                         (filter === 'services' && item.type === 'service');
    
    return matchesSearch && matchesFilter;
  });

  // Calculate statistics
  const stats = {
    total: allItems.length,
    products: allItems.filter(item => item.type === 'product').length,
    services: allItems.filter(item => item.type === 'service').length,
    lowStock: allItems.filter(item => 
      item.type === 'product' && 
      item.currentStock !== undefined && 
      item.lowStockAlert !== undefined && 
      item.currentStock <= item.lowStockAlert
    ).length
  };

  // Calculate pagination for filtered items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = filteredItems.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    
    try {
      const res = await fetch(`/api/items/${confirmDeleteId}`, { method: "DELETE" });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      toast.success("Item deleted successfully");
      fetchItems();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete item";
      toast.error(errorMessage);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleRefresh = () => {
    fetchItems();
  };

  const getItemIcon = (type: 'product' | 'service') => {
    return type === 'product' ? Package2 : Wrench;
  };

  const getItemColor = (type: 'product' | 'service') => {
    return type === 'product' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200';
  };

  const isLowStock = (item: ItemLite) => {
    return item.type === 'product' && 
           item.currentStock !== undefined && 
           item.lowStockAlert !== undefined && 
           item.currentStock <= item.lowStockAlert;
  };

  // Loading state
  if (loading && allItems.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Items
            </h1>
            <p className="text-muted-foreground">Loading your inventory...</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && allItems.length === 0) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Items
            </h1>
            <p className="text-muted-foreground">Manage your products and services</p>
          </div>
          <Button onClick={() => router.push("/Items/AddItem")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"> 
            <Plus className="mr-2 h-4 w-4" /> Add Item 
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Items</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Items
          </h1>
          <p className="text-muted-foreground">Manage your products and services</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => router.push("/Items/AddItem")} 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          > 
            <Plus className="mr-2 h-4 w-4" /> Add Item 
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Products</p>
                <p className="text-2xl font-bold text-green-600">{stats.products}</p>
              </div>
              <Package2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Services</p>
                <p className="text-2xl font-bold text-purple-600">{stats.services}</p>
              </div>
              <Wrench className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items or categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={filter} onValueChange={(value) => setFilter(value as ItemFilter)} className="w-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:flex">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </Badge>
          <Tabs value={view} onValueChange={(value) => setView(value as "grid" | "table")} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Mobile count badge */}
      <div className="sm:hidden">
        <Badge variant="secondary">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Content */}
      <Tabs value={view} className="w-full">
        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentPageItems.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-12">
                <div className="flex flex-col items-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {search || filter !== 'all' ? 'No items match your criteria' : 'No items found'}
                  </p>
                  <p className="text-sm">
                    {search || filter !== 'all' ? 'Try adjusting your search or filter' : 'Get started by adding your first item'}
                  </p>
                </div>
              </div>
            ) : currentPageItems.map(item => {
              const ItemIcon = getItemIcon(item.type || 'product');
              const isLowStockItem = isLowStock(item);
              
              return (
                <Card key={item.id} className={`hover:shadow-lg transition-all duration-200 hover:scale-105 ${
                  isLowStockItem ? 'ring-2 ring-orange-200' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${getItemColor(item.type || 'product')}`}>
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{item.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.categoryName}
                            </Badge>
                            {isLowStockItem && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/Items/edit/${item.id}`)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setConfirmDeleteId(item.id)} 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Sale Price:</span>
                        <div className="flex items-center gap-1 font-semibold text-green-600">
                          <IndianRupee className="h-3 w-3" />
                          {item.salePrice.toLocaleString()}
                        </div>
                      </div>
                      
                      {item.type === 'product' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Purchase Price:</span>
                            <div className="flex items-center gap-1 font-medium text-blue-600">
                              <IndianRupee className="h-3 w-3" />
                              {item.purchasePrice.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Stock:</span>
                            <div className="flex items-center gap-1">
                              <span className={`font-medium ${isLowStockItem ? 'text-orange-600' : 'text-gray-700'}`}>
                                {item.currentStock} {item.unit}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>HSN/SAC: {item.hsn_sac}</span>
                        <Badge variant="outline" className={`text-xs ${getItemColor(item.type || 'product')}`}>
                          {item.type === 'product' ? 'Product' : 'Service'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[120px]">Category</TableHead>
                    <TableHead className="min-w-[150px]">Item</TableHead>
                    <TableHead className="min-w-[100px]">Sale Price</TableHead>
                    <TableHead className="min-w-[100px]">Purchase Price</TableHead>
                    <TableHead className="min-w-[80px]">Stock</TableHead>
                    <TableHead className="min-w-[100px]">HSN/SAC</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                        <div className="flex flex-col items-center">
                          <Package className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-lg font-medium mb-2">
                            {search || filter !== 'all' ? 'No items match your criteria' : 'No items found'}
                          </p>
                          <p className="text-sm">
                            {search || filter !== 'all' ? 'Try adjusting your search or filter' : 'Get started by adding your first item'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentPageItems.map(item => {
                    const ItemIcon = getItemIcon(item.type || 'product');
                    const isLowStockItem = isLowStock(item);
                    
                    return (
                      <TableRow key={item.id} className={`hover:bg-muted/50 ${
                        isLowStockItem ? 'bg-orange-50' : ''
                      }`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${getItemColor(item.type || 'product')}`}>
                              <ItemIcon className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-medium">
                              {item.type === 'product' ? 'Product' : 'Service'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.categoryName}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {isLowStockItem && (
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <IndianRupee className="h-3 w-3" />
                            {item.salePrice.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-blue-600">
                            <IndianRupee className="h-3 w-3" />
                            {item.purchasePrice.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.type === 'product' ? (
                            <span className={`font-medium ${isLowStockItem ? 'text-orange-600' : 'text-gray-700'}`}>
                              {item.currentStock} {item.unit}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.hsn_sac}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => router.push(`/Items/edit/${item.id}`)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {filteredItems.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
            {(search || filter !== 'all') && ` (filtered from ${allItems.length} total)`}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className="w-20"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                disabled={page >= totalPages} 
                onClick={() => setPage(prev => prev + 1)}
                className="w-20"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and will permanently remove the item from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600" 
              onClick={handleDelete}
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}