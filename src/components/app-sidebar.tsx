"use client";

import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // Adjust this path if needed
import {
  ReceiptIndianRupee, ShoppingCart, Layers, ChartBar, CircleUserRound, WalletCards, BookOpen, LogOut,
  LayoutDashboard, ChevronDown, ChevronRight, FileText, Plus, Eye, Edit, TrendingUp, Package, LucideIcon,
  Wallet2, Wallet, NotebookPen, Truck, BanknoteArrowDown, Notebook, Recycle, BanknoteArrowUpIcon,
  Ticket, TicketsIcon, ShoppingBasket, Settings, Users, BlocksIcon, Tags, FileBox,
  Quote, Copyright,
  Landmark
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarFooter
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface SubItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  subItems?: SubItem[];
}

const items: MenuItem[] = [
  { title: "Dashboard", url: "/Dashboard", icon: LayoutDashboard },
  { title: "Fpo Lifecycle", url: "/FpoLifecycle", icon: Recycle },
  {
    title: "Sales", url: "#", icon: ReceiptIndianRupee, subItems: [
      { title: "Invoice", url: "/Sales/Invoice", icon: FileText },
      { title: "Quotation", url: "/Sales/Quotation", icon: Quote },
      { title: "Credit Note / Return", url: "/Sales/CreditNoteReturn", icon: Notebook },
      { title: "Delivery", url: "/Sales/Delivery", icon: Truck },
      { title: "Payment in", url: "/Sales/PaymentIn", icon: BanknoteArrowDown },
    ]
  },
  {
    title: "Purchases", url: "#", icon: ShoppingCart, subItems: [
      { title: "Purchase Order", url: "/Purchases/PurchaseOrder", icon: ShoppingBasket },
      { title: "Purchase Vouchers", url: "/Purchases/PurchaseVoucher", icon: TicketsIcon },
      { title: "Debit Nnote/ Return", url: "/Purchases/DebitNoteReturn", icon: FileText },
      { title: "Payment Out", url: "/Purchases/PaymentOut", icon: BanknoteArrowUpIcon },
    ]
  },
  { title: "Share holders", url: "/Shareholders", icon: Users },
  {
    title: "Items", url: "#", icon: Package, subItems: [
      { title: "Add Item", url: "/Items/AddItem", icon: Plus },
      { title: "Item List", url: "/Items/ItemList", icon: FileBox },
      { title: "Category", url: "/Items/Category", icon: Tags },
      { title: "Closing stock", url: "/Items/ClosingStock", icon: BlocksIcon },
    ]
  },
  { title: "Ledger", url: "/Ledger", icon: CircleUserRound },
  { title: "Pay/Rec/Cont", url: "/PaymentReceiptContra", icon: Wallet },
  { title: "Journal", url: "/Journal", icon: NotebookPen },
  {
    title: "Bank Book", url: "#", icon: WalletCards, subItems: [
      { title: "Add Bank", url: "/Banking/AddBankAccount", icon: Landmark },
      { title: "Books", url: "/Bankbook", icon: Notebook },
    ]
  },
  { title: "Cashbook", url: "/Cashbook", icon: Wallet2 },
  { title: "Reports", url: "/Reports", icon: ChartBar },
  { title: "Registers", url: "/Register", icon: BookOpen },
  { title: "Settings", url: "/ProfileSettings", icon: Settings },
  { title: "Logout", url: "#logout", icon: LogOut }
];

export function AppSidebar() {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const toggleItem = (title: string) => {
    setOpenItems(prev =>
      prev.includes(title) ? prev.filter(item => item !== title) : [...prev, title]
    );
  };

  const handleLogout = async () => {
const supabase = createClient()
    const { error } = await supabase.auth.signOut({scope:'local'});
    if (!error) {
      router.replace("/Login");
    }
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-r bg-emerald-50 border-emerald-200">
        <SidebarHeader className="p-4 border-b border-emerald-200">
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
            <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src="/Logo.jpeg" alt="Company Logo" width={24} height={24} className="object-cover w-6 h-6" />
            </div>
          </div>
          <div className="flex group-data-[collapsible=icon]:hidden items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image src="/Logo.jpeg" alt="Company Logo" width={24} height={24} className="object-cover w-6 h-6" />
            </div>
            <span className="font-bold text-lg text-emerald-900">Kisaan Setu</span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const isParentActive = item.subItems?.some(sub => pathname === sub.url) || pathname === item.url;

                  return (
                    <SidebarMenuItem key={item.title}>
                      {item.subItems ? (
                        <Collapsible open={openItems.includes(item.title) || isParentActive} onOpenChange={() => toggleItem(item.title)}>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className={cn(
                              "w-full flex items-center justify-between gap-3 hover:bg-emerald-100 hover:text-emerald-900",
                              isParentActive && "bg-emerald-100 text-emerald-900 font-semibold"
                            )}>
                              <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5 text-emerald-700" />
                                <span>{item.title}</span>
                              </div>
                              {openItems.includes(item.title) || isParentActive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.subItems.map(subItem => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild className={cn(
                                    "text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50",
                                    pathname === subItem.url && "text-emerald-900 underline font-medium"
                                  )}>
                                    <a href={subItem.url} className="flex items-center gap-3">
                                      <subItem.icon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <SidebarMenuButton asChild className={cn(
                          "w-full flex items-center gap-3 hover:bg-emerald-100 hover:text-emerald-900",
                          pathname === item.url && "bg-emerald-100 text-emerald-900 font-semibold"
                        )}>
                          {item.title === "Logout" ? (
                            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3">
                              <item.icon className="h-5 w-5 text-emerald-700" />
                              <span>{item.title}</span>
                            </button>
                          ) : (
                            <a href={item.url}>
                              <item.icon className="h-5 w-5 text-emerald-700" />
                              <span>{item.title}</span>
                            </a>
                          )}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-emerald-200 mt-auto">
          {/* Copyright notice for expanded sidebar */}
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col items-center text-center space-y-1">
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <Copyright className="h-3 w-3" />
                <span>{currentYear} Sukrsh Infotech</span>
              </div>
              <div className="text-xs text-emerald-500">
                All rights reserved
              </div>
            </div>
          </div>
          
          {/* Copyright notice for collapsed sidebar */}
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
            <div className="text-xs text-emerald-600 rotate-90 whitespace-nowrap">
              {/* © {currentYear} */}
              © Sukrsh
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout Confirmation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout from your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleLogout}>
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}