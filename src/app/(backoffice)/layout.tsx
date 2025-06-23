import { Geist, Geist_Mono } from "next/font/google"
import "../globals.css"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ReactNode, JSX } from 'react'
import { Officeheader } from "@/components/officeheader";
import { HeaderProvider } from "@/contexts/HeaderContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Kisaan Setu",
  description: "Kisaan setu is a software developed by sykrsh infotech for FPOs",
}

interface DashboardLayoutProps {
  children: ReactNode
}

export default async function DashboardLayout({ 
  children 
}: DashboardLayoutProps): Promise<JSX.Element> {
  // No need to pass cookies to createClient in Next.js 15, just call it directly
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/Login');
  }
  const fpoName = session.user.user_metadata?.FPOname || "User";

  return (
    <div>
      <HeaderProvider>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">
            <div className="sticky z-50 top-0 border-b-2 w-full flex gap-4 items-center justify-start p-4 bg-white shadow-sm">
              <SidebarTrigger />
              <h1 className="text-base md:text-2xl font-bold text-gray-800 leading-tight uppercase">
               {fpoName}
              </h1>
            </div>
            <div className="p-6">
              <Officeheader />
              {children}
            </div>
          </main>
        </SidebarProvider>
      </HeaderProvider>
    </div>
  )
}