"use client"
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Phone,
  UserCheck,
  Award,
  DollarSign,
  MapPin,
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

interface Shareholder {
  id: string;
  fpoId: string;
  name: string;
  fatherName: string;
  mobile: string;
  aadhaar: string;
  gender: "male" | "female" | "other";
  socialCategory: "General" | "SC" | "ST" | "OBC";
  landDetails: string;
  khasraNo: string;
  shareAlloted: number;
  faceValue: number;
  totalPaid: number;
  isDirector: boolean;
  avatar?: string;
}

const shareholders: Shareholder[] = [
  {
    id: "1",
    fpoId: "FPO-001",
    name: "Rajesh Kumar",
    fatherName: "Ramesh Lal",
    mobile: "9876543210",
    aadhaar: "123456789012",
    gender: "male",
    socialCategory: "OBC",
    landDetails: "4.5 acres",
    khasraNo: "KH123",
    shareAlloted: 500,
    faceValue: 100,
    totalPaid: 50000,
    isDirector: true,
  },
  {
    id: "2",
    fpoId: "FPO-002",
    name: "Priya Sharma",
    fatherName: "Suresh Sharma",
    mobile: "9876512345",
    aadhaar: "234567890123",
    gender: "female",
    socialCategory: "General",
    landDetails: "3.2 acres",
    khasraNo: "KH234",
    shareAlloted: 300,
    faceValue: 100,
    totalPaid: 30000,
    isDirector: false,
  },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export default function ShareholderPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
const router = useRouter()
  const filtered = shareholders.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) ||
    s.aadhaar.includes(search)
  );

  const totalShares = shareholders.reduce((acc, s) => acc + s.shareAlloted, 0);
  const totalPaid = shareholders.reduce((acc, s) => acc + s.totalPaid, 0);
  const directorCount = shareholders.filter((s) => s.isDirector).length;

  const handleAction = (action: string, id: string) => console.log(action, id);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Shareholders</h1>
          <p className="text-muted-foreground">Manage your shareholder members</p>
        </div>
        <Button onClick={(()=>{router.push('/Shareholders/newShareholder')})}>
          <Plus className="mr-2 w-4 h-4" /> Add New
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-xl font-semibold">{shareholders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Directors</p>
                <p className="text-xl font-semibold">{directorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Shares</p>
                <p className="text-xl font-semibold">{totalShares}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-semibold">
                  ₹{totalPaid.toLocaleString("en-IN")}
                </p>
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
                        <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{s.name}</CardTitle>
                        <CardDescription>{s.fatherName}</CardDescription>
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
                        <DropdownMenuItem onClick={() => handleAction("view", s.id)}>
                          <Eye className="mr-2 w-4 h-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("edit", s.id)}>
                          <Edit className="mr-2 w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleAction("delete", s.id)}
                        >
                          <Trash2 className="mr-2 w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {s.isDirector && <Badge>Director</Badge>}
                    <Badge variant="outline">{s.gender}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" /> {s.mobile}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {s.landDetails}
                  </div>
                  <p>Khasra No: {s.khasraNo}</p>
                  <p>Shares: {s.shareAlloted}</p>
                  <p>Total Paid: ₹{s.totalPaid.toLocaleString("en-IN")}</p>
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
                  <TableHead>Gender</TableHead>
                  <TableHead>Shares</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Director</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.mobile}</TableCell>
                    <TableCell>{s.gender}</TableCell>
                    <TableCell>{s.shareAlloted}</TableCell>
                    <TableCell>₹{s.totalPaid.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      {s.isDirector && <Badge variant="default">✔</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleAction("view", s.id)}>
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction("edit", s.id)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleAction("delete", s.id)}
                          >
                            Delete
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
    </div>
  );
}
