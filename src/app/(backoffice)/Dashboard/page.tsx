// app/(dashboard)/page.tsx
import { DashboardCards } from "@/components/dashboard-cards";
import { DashboardChart } from "@/components/dashboard-chart";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <DashboardCards />
      <DashboardChart />
     
    </div>
  );
}
