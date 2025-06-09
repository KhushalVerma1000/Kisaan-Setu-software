import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, DollarSign, TrendingUp, Package, Banknote, Warehouse, Briefcase, CreditCard,
  UserCheck, UserX, Building2
} from "lucide-react";

export function DashboardCards() {
  const cards = [
    {
      title: "Share Capital",
      value: "₹5,00,000",
      color: "text-blue-600",
      icon: <Briefcase className="w-5 h-5" />,
      href: "/Register",
      linkText: "See details",
    },
    {
      title: "Share Holders",
      value: "120",
      color: "text-emerald-600",
      icon: <Users className="w-5 h-5" />,
      href: "/Register",
      linkText: "View shareholders",
    },
    {
      title: "Sales",
      value: "₹2,45,000",
      color: "text-green-600",
      icon: <TrendingUp className="w-5 h-5" />,
      href: "/Sales",
      linkText: "View sales",
    },
    {
      title: "Purchase",
      value: "₹1,10,000",
      color: "text-yellow-600",
      icon: <Package className="w-5 h-5" />,
      href: "/Purchase",
      linkText: "View purchases",
    },
    {
      title: "Net Profit",
      value: "₹1,35,000",
      color: "text-purple-600",
      icon: <DollarSign className="w-5 h-5" />,
      href: "/Reports",
      linkText: "View profit report",
    },
    {
      title: "Stock",
      value: "₹40,000",
      color: "text-indigo-600",
      icon: <Warehouse className="w-5 h-5" />,
      href: "/Items",
      linkText: "Manage stock",
    },
    {
      title: "Bank",
      value: "₹3,00,000",
      color: "text-cyan-600",
      icon: <Banknote className="w-5 h-5" />,
      href: "/Cashbook",
      linkText: "Go to Cashbook",
    },
    {
      title: "Cash",
      value: "₹25,000",
      color: "text-rose-600",
      icon: <CreditCard className="w-5 h-5" />,
      href: "/Cashbook",
      linkText: "Go to Cashbook",
    },
    {
      title: "Sundry Debtors",
      value: "₹60,000",
      color: "text-teal-600",
      icon: <UserCheck className="w-5 h-5" />,
      href: "/Ledger",
      linkText: "View debtors",
    },
    {
      title: "Sundry Creditors",
      value: "₹45,000",
      color: "text-orange-600",
      icon: <UserX className="w-5 h-5" />,
      href: "/Ledger",
      linkText: "View creditors",
    },
    {
      title: "Assets",
      value: "₹7,20,000",
      color: "text-pink-600",
      icon: <Building2 className="w-5 h-5" />,
      href: "/Reports",
      linkText: "View assets",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <Link
              href={card.href}
              className="text-sm text-primary underline hover:text-primary/80 mt-2 inline-block"
            >
              {card.linkText}
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
