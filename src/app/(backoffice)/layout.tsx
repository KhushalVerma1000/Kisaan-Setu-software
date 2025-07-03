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
import { UserDetailsProvider } from "@/contexts/UserDetailsContext"
import { ToastContainer } from "react-toastify"
import { AppProviders } from "@/contexts/provider"

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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/Login');
  }
 
  const fpoName = user.user_metadata?.FPOname || "User";

  return (
    <div>
    <AppProviders>
    <UserDetailsProvider>
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
              <ToastContainer
  position="top-right"
  autoClose={3000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  rtl={false}
  pauseOnFocusLoss
  draggable
  pauseOnHover
/>
              {children}
            </div>
          </main>
        </SidebarProvider>
      </HeaderProvider>
    </UserDetailsProvider>
    </AppProviders>
    </div>
  )
}