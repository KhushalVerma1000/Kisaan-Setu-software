'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAppSelector } from '@/store/hooks';
import { CloudCog } from 'lucide-react';

// Interfaces
interface InventoryTransaction {
    id: string;
    transactionType: 'sale' | 'purchase' | 'adjustment' | 'opening';
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    transactionDate: string;
    documentNumber?: string;
    partyName?: string;
    unitPrice: number;
}

interface ItemSimple {
    id: string;
    name: string;
    type: 'product' | 'service';
    currentStock: number;
}

export default function InventoryAnalyticsPage() {
    const searchParams = useSearchParams();
    const queryItemId = searchParams.get('itemId');

    const [items, setItems] = useState<ItemSimple[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Get FPO ID from user context or environment
    const user = useAppSelector((state) => state.user);


    // Placeholder for FPO ID logic:
    const [fpoId, setFpoId] = useState<string | null>(null);

    useEffect(() => {
        // Simple logic to get FPO ID
        const storedFpoId = user.fpoId || localStorage.getItem('selectedFpoId');
        if (storedFpoId) {
            setFpoId(storedFpoId);
        } else {
            // Try to fetch user profile? 
            // For now assume it's in storage or we might fail.
            console.warn("FPO ID not found");
        }
    }, []);

    // Fetch Items
    useEffect(() => {
        if (!fpoId) return;

        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const res = await fetch(`/api/items?fpo_id=${fpoId}`);
                const data = await res.json();
                if (data.success) {
                    // Allow both products and services
                    const allItems = data.data; // .filter((i: any) => i.type === 'product' || i.type === 'service');
                    setItems(allItems);

                    if (allItems.length > 0) {
                        // Check URL param first
                        if (queryItemId && allItems.find((p: any) => p.id === queryItemId)) {
                            setSelectedItemId(queryItemId);
                        } else {
                            setSelectedItemId(allItems[0].id);
                        }
                    }
                } else {
                    toast.error("Failed to load items");
                }
            } catch (error) {
                console.error("Error fetching items:", error);
                toast.error("Error loading items");
            } finally {
                setLoadingItems(false);
            }
        };

        fetchItems();
    }, [fpoId]); // Remove queryItemId from dependency to avoid refetch on URL change unless FPO changes

    // Update selected ID if query param changes? Only if we want deep linking to work while on page.
    useEffect(() => {
        if (queryItemId && items.length > 0) {
            const found = items.find(p => p.id === queryItemId);
            if (found) {
                setSelectedItemId(queryItemId);
            }
        }
    }, [queryItemId, items]);


    // Fetch Transactions
    useEffect(() => {
        if (!selectedItemId || !fpoId) return;

        const fetchHistory = async () => {
            setLoadingTransactions(true);
            try {
                const res = await fetch(`/api/inventory/transactions?item_id=${selectedItemId}&fpo_id=${fpoId}&limit=100`);
                const data = await res.json();

                if (data.success) {
                    // Sort by date ascending for chart
                    const sorted = [...data.data].sort((a: any, b: any) =>
                        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
                    );
                    console.log(sorted)
                    setTransactions(sorted);
                } else {
                    toast.error("Failed to load transaction history");
                }
            } catch (error) {
                console.error("Error fetching transactions:", error);
                toast.error("Error loading history");
            } finally {
                setLoadingTransactions(false);
            }
        };

        fetchHistory();
    }, [selectedItemId, fpoId]);

    // Format data for chart
    const chartData = useMemo(() => {
        return transactions.map(t => ({
            date: format(new Date(t.transactionDate), 'dd MMM yyyy HH:mm'),
            value: t.stockAfter, // Use generic 'value' instead of 'stock'
            change: t.quantity,
            type: t.transactionType,
            tooltipDate: format(new Date(t.transactionDate), 'PPP p')
        }));
    }, [transactions]);

    const selectedItem = items.find(i => i.id === selectedItemId);
    const isService = selectedItem?.type === 'service';

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {isService ? 'Service Analytics' : 'Inventory Analytics'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {isService ? 'Track service usage and sales flow' : 'Track stock movements and history'}
                    </p>
                </div>

                <div className="w-full md:w-72">
                    <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={loadingItems}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                        </SelectTrigger>
                        <SelectContent>
                            {items.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.type === 'service' ? 'Service' : `Stock: ${item.currentStock}`})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">
                            {isService ? 'Net Usage/Flow' : 'Current Stock'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{selectedItem?.currentStock || 0}</div>
                        <p className="text-xs text-gray-500">
                            {isService ? 'Total flow tracked' : 'Units available'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{transactions.length}</div>
                        <p className="text-xs text-gray-500">In selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Last Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {transactions.length > 0 ? format(new Date(transactions[transactions.length - 1].transactionDate), 'dd MMM') : '-'}
                        </div>
                        <p className="text-xs text-gray-500">
                            {transactions.length > 0 ? format(new Date(transactions[transactions.length - 1].transactionDate), 'HH:mm') : '-'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>{isService ? 'Usage Trends' : 'Stock History'}</CardTitle>
                    <CardDescription>
                        {isService ? 'Service flow over time' : 'Stock level changes over time'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    {loadingTransactions ? (
                        <div className="h-full flex items-center justify-center text-gray-400">Loading history...</div>
                    ) : transactions.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">No transaction data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                // simple tick formatter to reduce clutter if needed
                                />
                                <YAxis />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 border rounded shadow-lg dark:bg-gray-800">
                                                    <p className="font-semibold">{data.tooltipDate}</p>
                                                    <p className="text-blue-600">
                                                        {isService ? 'Net Flow: ' : 'Stock: '} {data.value}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {data.type === 'sale' ? 'Sold' : data.type === 'purchase' ? 'Purchased' : data.type}: {Math.abs(data.change)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#000" />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isService ? "#8b5cf6" : "#2563eb"} // Purple for service, Blue for product
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* Transaction List */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {transactions.slice().reverse().slice(0, 5).map((t) => (
                            <div key={t.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium capitalize">{t.transactionType}</p>
                                    <p className="text-sm text-gray-500">{format(new Date(t.transactionDate), 'dd MMM yyyy, HH:mm')}</p>
                                    {t.documentNumber && <p className="text-xs text-gray-400">Ref: {t.documentNumber}</p>}
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${t.transactionType === 'sale' ? 'text-red-500' : 'text-green-500'}`}>
                                        {t.transactionType === 'sale' ? '-' : '+'}{Math.abs(t.quantity)}
                                    </p>
                                    <p className="text-sm text-gray-500">{isService ? 'Net Flow' : 'Balance'}: {t.stockAfter}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
