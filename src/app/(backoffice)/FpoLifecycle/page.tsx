import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Users, TrendingUp, DollarSign, Building2, Award, Target } from 'lucide-react';

interface StageData {
  id: number;
  title: string;
  period: string;
  status: 'active' | 'inactive' | 'completed';
  metrics: {
    members: number;
    sales: number;
    netProfit?: number;
    netLoss?: number;
    managementCost: number;
    equityGrant: number;
  };
}

const stageData: StageData[] = [
  {
    id: 1,
    title: 'Stage: 1',
    period: 'First 3 Years',
    status: 'completed',
    metrics: {
      members: 0,
      sales: 715.00,
      netProfit: 715.00,
      managementCost: 0,
      equityGrant: 0
    }
  },
  {
    id: 2,
    title: 'Stage: 2',
    period: 'Next 2 Years',
    status: 'active',
    metrics: {
      members: 0,
      sales: 0.00,
      netLoss: 0.00,
      managementCost: 0,
      equityGrant: 0
    }
  },
  {
    id: 3,
    title: 'Stage: 3',
    period: 'Overall',
    status: 'inactive',
    metrics: {
      members: 0,
      sales: 444859.70,
      netLoss: 365838.30,
      managementCost: 0,
      equityGrant: 0
    }
  }
];

const getStageVariant = (status: StageData['status']) => {
  switch (status) {
    case 'completed': return 'default';
    case 'active': return 'secondary';
    case 'inactive': return 'outline';
    default: return 'secondary';
  }
};

const getStageColor = (status: StageData['status']) => {
  switch (status) {
    case 'completed': return 'bg-green-500 hover:bg-green-600';
    case 'active': return 'bg-gray-600 hover:bg-gray-700';
    case 'inactive': return 'bg-red-600 hover:bg-red-700';
    default: return 'bg-gray-600 hover:bg-gray-700';
  }
};

const MetricCard = ({ 
  icon: Icon, 
  title, 
  value, 
  isProfit, 
  isLoss 
}: { 
  icon: React.ElementType;
  title: string;
  value: number;
  isProfit?: boolean;
  isLoss?: boolean;
}) => (
  <Card className="h-full hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${
          isProfit ? 'bg-green-100 text-green-600' : 
          isLoss ? 'bg-red-100 text-red-600' : 
          'bg-blue-100 text-blue-600'
        }`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className={`text-xl font-bold ${
            isProfit ? 'text-green-600' : 
            isLoss ? 'text-red-600' : 
            'text-foreground'
          }`}>
            {title.toLowerCase().includes('members') || title.toLowerCase().includes('grant') ? 
              value.toLocaleString() : 
              `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            }
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function FPOLifecyclePage() {
  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/fpo">FPO Lifecycle</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Lifecycle</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">FPO Lifecycle</h1>
          <p className="text-muted-foreground">Track your Farmer Producer Organization's progress across different stages</p>
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-6">
        {stageData.map((stage, index) => (
          <Card key={stage.id} className="overflow-hidden hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className={`px-4 py-2 rounded-lg text-white font-semibold ${getStageColor(stage.status)}`}>
                    {stage.title}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{stage.period}</CardTitle>
                    <Badge variant={getStageVariant(stage.status)} className="mt-1 capitalize">
                      {stage.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricCard
                  icon={Users}
                  title="Members"
                  value={stage.metrics.members}
                />
                <MetricCard
                  icon={TrendingUp}
                  title="Sales"
                  value={stage.metrics.sales}
                />
                {stage.metrics.netProfit !== undefined ? (
                  <MetricCard
                    icon={DollarSign}
                    title="Net Profit"
                    value={stage.metrics.netProfit}
                    isProfit={true}
                  />
                ) : (
                  <MetricCard
                    icon={DollarSign}
                    title="Net Loss"
                    value={stage.metrics.netLoss || 0}
                    isLoss={true}
                  />
                )}
                <MetricCard
                  icon={Building2}
                  title="Management Cost"
                  value={stage.metrics.managementCost}
                />
                <MetricCard
                  icon={Award}
                  title="Equity Grant"
                  value={stage.metrics.equityGrant}
                />
                {/* Summary Card for overall performance */}
                <Card className="h-full hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">
                          Performance
                        </p>
                        <p className={`text-lg font-bold ${
                          (stage.metrics.netProfit && stage.metrics.netProfit > 0) ? 'text-green-600' :
                          (stage.metrics.netLoss && stage.metrics.netLoss > 0) ? 'text-red-600' : 
                          'text-blue-600'
                        }`}>
                          {stage.status === 'completed' ? 'Successful' :
                           stage.status === 'active' ? 'In Progress' : 'Planned'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Statistics */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl">Overall Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-blue-600">3</p>
              <p className="text-sm text-muted-foreground">Total Stages</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-green-600">1</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-gray-600">1</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-red-600">1</p>
              <p className="text-sm text-muted-foreground">Planned</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}