"use client"
import React, { useState } from 'react';
import { FileText, TrendingUp, Receipt, Shield, Download, Calendar, Filter, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define types for better type safety
type ReportStatus = 'ready' | 'warning' | 'processing' | 'live';
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface Report {
  name: string;
  description: string;
  lastUpdated: string;
  status: ReportStatus;
}

interface ReportCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: BadgeVariant;
  reports: Report[];
}

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [date, setDate] = useState<Date | undefined>(new Date());

  const reportCategories: ReportCategory[] = [
    {
      id: 'business',
      title: 'Business Reports',
      icon: TrendingUp,
      color: 'bg-blue-500',
      badge: 'default',
      reports: [
        { name: 'Debtors Ageing', description: 'Outstanding customer payments analysis', lastUpdated: '2 hours ago', status: 'ready' },
        { name: 'Creditor Ageing', description: 'Supplier payment tracking', lastUpdated: '4 hours ago', status: 'ready' },
        { name: 'Trial Balance', description: 'General ledger account balances', lastUpdated: '1 day ago', status: 'ready' },
        { name: 'Profit and Loss', description: 'Revenue and expense summary', lastUpdated: '1 day ago', status: 'ready' },
        { name: 'Balance Sheet', description: 'Financial position statement', lastUpdated: '1 day ago', status: 'ready' }
      ]
    },
    {
      id: 'stock',
      title: 'Stock Reports',
      icon: FileText,
      color: 'bg-green-500',
      badge: 'secondary',
      reports: [
        { name: 'Stock Summary', description: 'Current inventory overview', lastUpdated: '30 minutes ago', status: 'ready' },
        { name: 'Low Stock', description: 'Items below minimum threshold', lastUpdated: '1 hour ago', status: 'warning' },
        { name: 'Fast Moving Items', description: 'High turnover inventory analysis', lastUpdated: '3 hours ago', status: 'ready' },
        { name: 'Items Not Moving', description: 'Slow-moving stock identification', lastUpdated: '6 hours ago', status: 'ready' }
      ]
    },
    {
      id: 'gst',
      title: 'GST Reports',
      icon: Receipt,
      color: 'bg-purple-500',
      badge: 'outline',
      reports: [
        { name: 'GSTR1', description: 'Outward supplies return', lastUpdated: '2 hours ago', status: 'ready' },
        { name: 'GSTR2', description: 'Inward supplies return', lastUpdated: '2 hours ago', status: 'ready' },
        { name: 'GSTR3 B', description: 'Monthly return summary', lastUpdated: '1 day ago', status: 'processing' }
      ]
    },
    {
      id: 'audit',
      title: 'Audit Logs',
      icon: Shield,
      color: 'bg-orange-500',
      badge: 'destructive',
      reports: [
        { name: 'System Logs', description: 'User activity and system events', lastUpdated: 'Real-time', status: 'live' },
        { name: 'Transaction Logs', description: 'Financial transaction audit trail', lastUpdated: '10 minutes ago', status: 'ready' },
        { name: 'Access Logs', description: 'User login and access history', lastUpdated: '15 minutes ago', status: 'ready' }
      ]
    }
  ];

  const getStatusBadge = (status: ReportStatus): { variant: BadgeVariant; text: string } => {
    const statusConfig: Record<ReportStatus, { variant: BadgeVariant; text: string }> = {
      ready: { variant: 'default', text: 'Ready' },
      warning: { variant: 'destructive', text: 'Alert' },
      processing: { variant: 'secondary', text: 'Processing' },
      live: { variant: 'outline', text: 'Live' }
    };
    return statusConfig[status];
  };

  const filteredCategories = selectedCategory === 'all' 
    ? reportCategories 
    : reportCategories.filter(cat => cat.id === selectedCategory);

  const handleDownload = (reportName: string, categoryTitle: string) => {
    console.log(`Downloading ${reportName} from ${categoryTitle}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <span>Reports Master</span>
                <span className="mx-2">/</span>
                <span>Reports List</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {date ? date.toLocaleDateString() : "Pick a date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button className="w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export All</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center">
                    <Filter className="w-5 h-5 text-muted-foreground mr-2" />
                    <span className="text-sm font-medium">Filter by category:</span>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="gst">GST</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reportCategories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <Badge key={category.id} variant={category.badge} className="cursor-pointer">
                        <IconComponent className="w-3 h-3 mr-1" />
                        {category.reports.length}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">All Reports</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="text-xs sm:text-sm px-2 py-2">Business</TabsTrigger>
            <TabsTrigger value="stock" className="text-xs sm:text-sm px-2 py-2">Stock</TabsTrigger>
            <TabsTrigger value="gst" className="text-xs sm:text-sm px-2 py-2">GST</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs sm:text-sm px-2 py-2">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 sm:space-y-6">
            {reportCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card key={category.id}>
                  <CardHeader className={`${category.color} text-white rounded-t-lg p-4 sm:p-6`}>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-white text-lg sm:text-xl truncate">{category.title}</CardTitle>
                        <CardDescription className="text-white/80 text-sm">
                          {category.reports.length} reports available
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {category.reports.map((report, index) => (
                        <Card key={index} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
                                  {report.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {report.description}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8 p-0"
                                onClick={() => handleDownload(report.name, category.title)}
                              >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant={getStatusBadge(report.status).variant} className="text-xs">
                                  {getStatusBadge(report.status).text}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate">
                                  {report.lastUpdated}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2 sm:h-8 sm:px-3"
                                onClick={() => handleDownload(report.name, category.title)}
                              >
                                Generate
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {reportCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <TabsContent key={category.id} value={category.id} className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader className={`${category.color} text-white rounded-t-lg p-4 sm:p-6`}>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-white text-lg sm:text-xl truncate">{category.title}</CardTitle>
                        <CardDescription className="text-white/80 text-sm">
                          {category.reports.length} reports available
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {category.reports.map((report, index) => (
                        <Card key={index} className="group hover:shadow-md transition-all duration-200 cursor-pointer">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
                                  {report.name}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {report.description}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-8 w-8 p-0"
                                onClick={() => handleDownload(report.name, category.title)}
                              >
                                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant={getStatusBadge(report.status).variant} className="text-xs">
                                  {getStatusBadge(report.status).text}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate">
                                  {report.lastUpdated}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2 sm:h-8 sm:px-3"
                                onClick={() => handleDownload(report.name, category.title)}
                              >
                                Generate
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Reports</p>
                  <p className="text-lg sm:text-2xl font-semibold">
                    {reportCategories.reduce((acc, cat) => acc + cat.reports.length, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Generated Today</p>
                  <p className="text-lg sm:text-2xl font-semibold">24</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Scheduled</p>
                  <p className="text-lg sm:text-2xl font-semibold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Real-time</p>
                  <p className="text-lg sm:text-2xl font-semibold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}