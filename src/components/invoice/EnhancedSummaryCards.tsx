// Add this import to your existing page.tsx imports
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Target,
  PieChart,
  Users
} from "lucide-react";

interface StatisticsData {
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  outstandingAmount: number;
  monthlyGrowth: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  statusDistribution: {
    draft: { count: number; amount: number };
    sent: { count: number; amount: number };
    paid: { count: number; amount: number };
    cancelled: { count: number; amount: number };
  };
  collectionEfficiency: number;
  overdueRate: number;
  topCustomers: Array<{
    customerName: string;
    totalInvoices: number;
    totalAmount: number;
    averageInvoiceValue: number;
    lastInvoiceDate: string;
    outstandingAmount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    totalInvoices: number;
    totalRevenue: number;
    averageInvoiceValue: number;
    paidInvoices: number;
    outstandingAmount: number;
  }>;
}

interface EnhancedSummaryCardsProps {
  statistics: StatisticsData | null;
  isLoading?: boolean;
}

const EnhancedSummaryCards: React.FC<EnhancedSummaryCardsProps> = ({ 
  statistics, 
  isLoading = false 
}) => {
  // Calculate derived metrics
  const collectionRate = statistics?.collectionEfficiency || 0;
  const monthlyGrowthRate = statistics?.monthlyGrowth || 0;
  const pendingActions = (statistics?.statusDistribution?.draft?.count || 0) + (statistics?.statusDistribution?.sent?.count || 0);
  const overdueRate = statistics?.overdueRate || 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    // 1. Total Revenue with Growth
    {
      title: "Total Revenue (FY)",
      value: `₹${(statistics?.totalRevenue || 0).toLocaleString('en-IN')}`,
      subtitle: `${statistics?.totalInvoices || 0} invoices • ₹${(statistics?.averageInvoiceValue || 0).toLocaleString('en-IN')} avg`,
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      trend: monthlyGrowthRate > 0 ? 'up' : monthlyGrowthRate < 0 ? 'down' : null,
      trendValue: monthlyGrowthRate !== 0 ? `${Math.abs(monthlyGrowthRate).toFixed(1)}% vs last month` : 'No previous data'
    },
    
    // 2. Outstanding Amount
    {
      title: "Outstanding Amount",
      value: `₹${(statistics?.outstandingAmount || 0).toLocaleString('en-IN')}`,
      subtitle: `${((statistics?.outstandingAmount || 0) / (statistics?.totalRevenue || 1) * 100).toFixed(1)}% of total revenue`,
      icon: AlertTriangle,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      badge: statistics?.statusDistribution?.sent?.count ? {
        text: `${statistics.statusDistribution.sent.count} awaiting payment`,
        variant: "secondary" as const
      } : undefined
    },
    
    // 3. Collection Rate
    {
      title: "Collection Efficiency",
      value: `${collectionRate.toFixed(1)}%`,
      subtitle: `${statistics?.statusDistribution?.paid?.count || 0} paid of ${statistics?.totalInvoices || 0} total invoices`,
      icon: Target,
      iconBg: collectionRate >= 80 ? "bg-green-100" : collectionRate >= 60 ? "bg-yellow-100" : "bg-red-100",
      iconColor: collectionRate >= 80 ? "text-green-600" : collectionRate >= 60 ? "text-yellow-600" : "text-red-600",
      trend: collectionRate >= 80 ? 'up' : collectionRate >= 60 ? null : 'down'
    },
    
    // 4. Monthly Performance
    {
      title: "Current Month",
      value: `₹${(statistics?.currentMonthRevenue || 0).toLocaleString('en-IN')}`,
      subtitle: `vs ₹${(statistics?.previousMonthRevenue || 0).toLocaleString('en-IN')} last month`,
      icon: TrendingUp,
      iconBg: monthlyGrowthRate >= 0 ? "bg-blue-100" : "bg-red-100",
      iconColor: monthlyGrowthRate >= 0 ? "text-blue-600" : "text-red-600",
      trend: monthlyGrowthRate > 0 ? 'up' : monthlyGrowthRate < 0 ? 'down' : null,
      trendValue: monthlyGrowthRate !== 0 ? `${Math.abs(monthlyGrowthRate).toFixed(1)}% ${monthlyGrowthRate >= 0 ? 'growth' : 'decline'}` : 'First month'
    },
    
    // 5. Pending Actions (Draft + Sent)
    {
      title: "Pending Actions",
      value: `${pendingActions}`,
      subtitle: `${statistics?.statusDistribution?.draft?.count || 0} draft • ${statistics?.statusDistribution?.sent?.count || 0} awaiting payment`,
      icon: PieChart,
      iconBg: pendingActions > 10 ? "bg-yellow-100" : "bg-gray-100",
      iconColor: pendingActions > 10 ? "text-yellow-600" : "text-gray-600",
      badge: (statistics?.statusDistribution?.draft?.count || 0) > 0 ? {
        text: `${statistics?.statusDistribution?.draft?.count} need completion`,
        variant: "secondary" as const
      } : undefined
    },

    // 6. Top Customer Performance
    {
      title: "Top Customer",
      value: statistics?.topCustomers?.[0]?.customerName || "No customers",
      subtitle: statistics?.topCustomers?.[0] ? 
        `₹${statistics.topCustomers[0].totalAmount.toLocaleString('en-IN')} • ${statistics.topCustomers[0].totalInvoices} invoices` : 
        "No data available",
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      badge: statistics?.topCustomers?.[0]?.outstandingAmount ? {
        text: `₹${statistics.topCustomers[0].outstandingAmount.toLocaleString('en-IN')} pending`,
        variant: statistics.topCustomers[0].outstandingAmount > 0 ? "destructive" as const : "secondary" as const
      } : undefined
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {card.title}
                    </p>
                    {card.badge && (
                      <Badge variant={card.badge.variant} className="text-xs">
                        {card.badge.text}
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold truncate mb-1" title={card.value}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {card.subtitle}
                  </p>
                  {card.trend && card.trendValue && (
                    <div className={`flex items-center text-xs ${
                      card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      <span className="whitespace-nowrap font-medium">{card.trendValue}</span>
                    </div>
                  )}
                </div>
                <div className={`h-12 w-12 ${card.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ml-4`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Distribution - Condensed */}
      {statistics?.statusDistribution && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Invoice Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(statistics.statusDistribution).map(([status, data]) => (
                <div key={status} className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    status === 'paid' ? 'bg-green-100' :
                    status === 'sent' ? 'bg-blue-100' :
                    status === 'draft' ? 'bg-gray-100' :
                    'bg-orange-100'
                  }`}>
                    <span className={`text-xl font-bold ${
                      status === 'paid' ? 'text-green-600' :
                      status === 'sent' ? 'text-blue-600' :
                      status === 'draft' ? 'text-gray-600' :
                      'text-orange-600'
                    }`}>
                      {data.count}
                    </span>
                  </div>
                  <p className="text-sm font-semibold capitalize">{status}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{data.amount?.toLocaleString('en-IN') || '0'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedSummaryCards;