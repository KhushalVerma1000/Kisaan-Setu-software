"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeaderButtons } from "@/hooks/useHeaderButtons";
import { Menu, X } from "lucide-react";

import GeneralTab from "@/components/settings/GeneralTab";
import BankDetailsTab from "@/components/settings/BankDetailsTab";
import InvoiceTab from "@/components/settings/InvoiceTab";
import ItemsTab from "@/components/settings/ItemsTab";
import TaxTab from "@/components/settings/TaxTab";
import EInvoiceTab from "@/components/settings/EInvoiceTab";

export default function SettingsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const saveProfileSettings = useCallback(() => {
    console.log("Save settings clicked");
  }, []);

  const headerButtons = useMemo(() => [
    { 
      label: "Save", 
      onClick: saveProfileSettings
    },
  ], [saveProfileSettings]);

  useHeaderButtons(headerButtons);

  const tabs = [
    { value: "general", label: "General", shortLabel: "General" },
    { value: "bank", label: "Bank Details", shortLabel: "Bank" },
    { value: "invoice", label: "Invoice", shortLabel: "Invoice" },
    { value: "items", label: "Items", shortLabel: "Items" },
    { value: "tax", label: "Taxes & GST", shortLabel: "Tax" },
    { value: "einvoice", label: "e-Invoicing", shortLabel: "e-Invoice" },
  ];

  const handleTabChange = (value : string) => {
    setActiveTab(value);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Home / Settings</p>
              </div>
              
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
            
            {/* Mobile dropdown menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden mt-4 bg-white border rounded-lg shadow-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={`w-full text-left px-4 py-3 text-sm border-b last:border-b-0 hover:bg-gray-50 ${
                      activeTab === tab.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Desktop/Tablet Tabs */}
            <div className="hidden md:block mb-6">
              <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1 bg-gray-100 rounded-lg">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value}
                    className="px-2 py-2 text-xs lg:text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap"
                  >
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.shortLabel}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Horizontal scrollable tabs for small tablets */}
            <div className="md:hidden mb-6">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex w-max min-w-full p-1 bg-gray-100 rounded-lg">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value}
                      className="px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap flex-shrink-0"
                    >
                      {tab.shortLabel}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-sm border min-h-[400px]">
              <TabsContent value="general" className="m-0 p-4 sm:p-6">
                <GeneralTab />
              </TabsContent>

              <TabsContent value="bank" className="m-0 p-4 sm:p-6">
                <BankDetailsTab />
              </TabsContent>

              <TabsContent value="invoice" className="m-0 p-4 sm:p-6">
                <InvoiceTab />
              </TabsContent>

              <TabsContent value="items" className="m-0 p-4 sm:p-6">
                <ItemsTab />
              </TabsContent>

              <TabsContent value="tax" className="m-0 p-4 sm:p-6">
                <TaxTab />
              </TabsContent>

              <TabsContent value="einvoice" className="m-0 p-4 sm:p-6">
                <EInvoiceTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}