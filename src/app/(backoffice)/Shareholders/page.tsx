"use client"
import React, { useState } from 'react';
import { Users, Search, Filter, Plus, MoreHorizontal, Edit, Trash2, Eye, Phone, Mail, MapPin, Calendar, DollarSign, TrendingUp, Award, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ShareholderMember {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joiningDate: string;
  status: 'active' | 'inactive' | 'suspended';
  membershipType: 'founder' | 'regular' | 'associate';
  shares: {
    totalShares: number;
    shareValue: number;
    totalInvestment: number;
  };
  farmDetails: {
    landSize: number;
    cropTypes: string[];
    location: string;
  };
  transactions: {
    totalTransactions: number;
    lastTransaction: string;
    totalVolume: number;
  };
  avatar?: string;
}

const shareholderMembers: ShareholderMember[] = [
  {
    id: '1',
    membershipId: 'FPO-2024-001',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    phone: '+91 98765 43210',
    address: 'Village Rampur, Tehsil Bhiwani, Haryana',
    joiningDate: '2024-01-15',
    status: 'active',
    membershipType: 'founder',
    shares: {
      totalShares: 500,
      shareValue: 100,
      totalInvestment: 50000
    },
    farmDetails: {
      landSize: 5.5,
      cropTypes: ['Wheat', 'Rice', 'Sugarcane'],
      location: 'Bhiwani, Haryana'
    },
    transactions: {
      totalTransactions: 24,
      lastTransaction: '2024-06-15',
      totalVolume: 125000
    }
  },
  {
    id: '2',
    membershipId: 'FPO-2024-002',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91 87654 32109',
    address: 'Village Kaithal, Tehsil Kaithal, Haryana',
    joiningDate: '2024-02-20',
    status: 'active',
    membershipType: 'regular',
    shares: {
      totalShares: 250,
      shareValue: 100,
      totalInvestment: 25000
    },
    farmDetails: {
      landSize: 3.2,
      cropTypes: ['Cotton', 'Mustard'],
      location: 'Kaithal, Haryana'
    },
    transactions: {
      totalTransactions: 18,
      lastTransaction: '2024-06-10',
      totalVolume: 87500
    }
  },
  {
    id: '3',
    membershipId: 'FPO-2024-003',
    name: 'Suresh Patel',
    email: 'suresh.patel@email.com',
    phone: '+91 76543 21098',
    address: 'Village Jind, Tehsil Jind, Haryana',
    joiningDate: '2024-03-10',
    status: 'inactive',
    membershipType: 'regular',
    shares: {
      totalShares: 150,
      shareValue: 100,
      totalInvestment: 15000
    },
    farmDetails: {
      landSize: 2.8,
      cropTypes: ['Bajra', 'Jowar'],
      location: 'Jind, Haryana'
    },
    transactions: {
      totalTransactions: 8,
      lastTransaction: '2024-04-22',
      totalVolume: 32000
    }
  },
  {
    id: '4',
    membershipId: 'FPO-2024-004',
    name: 'Anjali Singh',
    email: 'anjali.singh@email.com',
    phone: '+91 65432 10987',
    address: 'Village Rohtak, Tehsil Rohtak, Haryana',
    joiningDate: '2024-04-05',
    status: 'active',
    membershipType: 'associate',
    shares: {
      totalShares: 100,
      shareValue: 100,
      totalInvestment: 10000
    },
    farmDetails: {
      landSize: 1.5,
      cropTypes: ['Vegetables', 'Fruits'],
      location: 'Rohtak, Haryana'
    },
    transactions: {
      totalTransactions: 12,
      lastTransaction: '2024-06-18',
      totalVolume: 45000
    }
  },
  {
    id: '5',
    membershipId: 'FPO-2024-005',
    name: 'Vikram Yadav',
    email: 'vikram.yadav@email.com',
    phone: '+91 54321 09876',
    address: 'Village Panipat, Tehsil Panipat, Haryana',
    joiningDate: '2024-05-12',
    status: 'suspended',
    membershipType: 'regular',
    shares: {
      totalShares: 200,
      shareValue: 100,
      totalInvestment: 20000
    },
    farmDetails: {
      landSize: 4.0,
      cropTypes: ['Wheat', 'Barley'],
      location: 'Panipat, Haryana'
    },
    transactions: {
      totalTransactions: 6,
      lastTransaction: '2024-05-30',
      totalVolume: 28000
    }
  }
];

const getStatusBadge = (status: ShareholderMember['status']) => {
  const statusConfig = {
    active: { variant: 'default', text: 'Active', color: 'bg-green-500' },
    inactive: { variant: 'secondary', text: 'Inactive', color: 'bg-gray-500' },
    suspended: { variant: 'destructive', text: 'Suspended', color: 'bg-red-500' }
  };
  return statusConfig[status];
};

const getMembershipTypeBadge = (type: ShareholderMember['membershipType']) => {
  const typeConfig = {
    founder: { variant: 'default', text: 'Founder', color: 'bg-purple-500' },
    regular: { variant: 'secondary', text: 'Regular', color: 'bg-blue-500' },
    associate: { variant: 'outline', text: 'Associate', color: 'bg-orange-500' }
  };
  return typeConfig[type];
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export default function ShareholderMembersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredMembers = shareholderMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.membershipId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesType = membershipTypeFilter === 'all' || member.membershipType === membershipTypeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalShares = shareholderMembers.reduce((acc, member) => acc + member.shares.totalShares, 0);
  const totalInvestment = shareholderMembers.reduce((acc, member) => acc + member.shares.totalInvestment, 0);
  const totalLandSize = shareholderMembers.reduce((acc, member) => acc + member.farmDetails.landSize, 0);
  const activeMembers = shareholderMembers.filter(member => member.status === 'active').length;

  const handleMemberAction = (action: string, memberId: string) => {
    console.log(`${action} action for member: ${memberId}`);
  };

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
            <BreadcrumbLink href="/dashboard/members">Members</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Shareholders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Shareholder Members</h1>
          <p className="text-muted-foreground">Manage your FPO's shareholder members and their equity participation</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add New Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Members</p>
                <p className="text-lg sm:text-2xl font-semibold">{shareholderMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Active Members</p>
                <p className="text-lg sm:text-2xl font-semibold">{activeMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Shares</p>
                <p className="text-lg sm:text-2xl font-semibold">{totalShares.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Investment</p>
                <p className="text-lg sm:text-2xl font-semibold">₹{totalInvestment.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[300px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={membershipTypeFilter} onValueChange={setMembershipTypeFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="founder">Founder</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="associate">Associate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === 'table' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Content */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'table')}>
        <TabsContent value="grid" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate">{member.name}</CardTitle>
                        <CardDescription className="text-sm">{member.membershipId}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleMemberAction('view', member.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMemberAction('edit', member.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Member
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleMemberAction('delete', member.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={getStatusBadge(member.status).variant}>
                      {getStatusBadge(member.status).text}
                    </Badge>
                    <Badge variant={getMembershipTypeBadge(member.membershipType).variant}>
                      {getMembershipTypeBadge(member.membershipType).text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <Award className="w-4 h-4 mr-2" />
                        <span>Shares</span>
                      </div>
                      <p className="font-semibold">{member.shares.totalShares.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>Investment</span>
                      </div>
                      <p className="font-semibold">₹{member.shares.totalInvestment.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Land Size</span>
                      </div>
                      <p className="font-semibold">{member.farmDetails.landSize} acres</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        <span>Transactions</span>
                      </div>
                      <p className="font-semibold">{member.transactions.totalTransactions}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Phone className="w-4 h-4 mr-2" />
                      <span className="truncate">{member.phone}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <Mail className="w-4 h-4 mr-2" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Crops: {member.farmDetails.cropTypes.join(', ')}
                    </p>
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
                  <TableHead>Member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Land Size</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.membershipId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm truncate">{member.phone}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(member.status).variant}>
                        {getStatusBadge(member.status).text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMembershipTypeBadge(member.membershipType).variant}>
                        {getMembershipTypeBadge(member.membershipType).text}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.shares.totalShares.toLocaleString()}</TableCell>
                    <TableCell>₹{member.shares.totalInvestment.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{member.farmDetails.landSize} acres</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleMemberAction('view', member.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMemberAction('edit', member.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleMemberAction('delete', member.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl">Membership Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{totalLandSize.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Total Land (acres)</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-green-600">
                {shareholderMembers.filter(m => m.membershipType === 'founder').length}
              </p>
              <p className="text-sm text-muted-foreground">Founder Members</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-purple-600">
                ₹{Math.round(totalInvestment / shareholderMembers.length).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-muted-foreground">Avg Investment</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-orange-600">
                {Math.round(totalShares / shareholderMembers.length)}
              </p>
              <p className="text-sm text-muted-foreground">Avg Shares</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}