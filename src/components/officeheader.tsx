"use client";

import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import { useHeaderContext } from "@/contexts/HeaderContext";
import { Fragment } from "react";

export function Officeheader() {
  const pathname = usePathname();
  const { headerButtons } = useHeaderContext();
  
  // Check if a string is a UUID
  const isUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Convert camelCase to separate words
  const camelCaseToWords = (str: string) => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Handle consecutive capitals
      .trim();
  };
  
  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [];
    
    // Add Dashboard as the root
    breadcrumbs.push({
      label: "Dashboard",
      href: "/Dashboard",
      isActive: pathSegments.length === 1 && pathSegments[0] === "Dashboard"
    });
    
    // Process each segment
    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip the first 'dashboard' segment as it's already added
      if (segment === "Dashboard") return;
      
      // Skip UUID segments
      if (isUUID(segment)) return;
      
      const isLast = index === pathSegments.length - 1;
      const label = formatSegmentLabel(segment);
      
      breadcrumbs.push({
        label,
        href: currentPath,
        isActive: isLast
      });
    });
    
    return breadcrumbs;
  };
  
  // Format segment label (capitalize words and replace hyphens with spaces)
  const formatSegmentLabel = (segment: string) => {
    // Handle common route patterns
    const routeLabels: Record<string, string> = {
      'quotations': 'Quotations',
      'invoices': 'Invoices', 
      'customers': 'Customers',
      'products': 'Products',
      'sales': 'Sales',
      'purchases': 'Purchases',
      'inventory': 'Inventory',
      'reports': 'Reports',
      'settings': 'Settings',
      'new': 'New',
      'edit': 'Edit',
      'view': 'View',
      'list': 'List'
    };
    
    // Return custom label if exists
    if (routeLabels[segment]) {
      return routeLabels[segment];
    }
    
    // Handle camelCase conversion first
    let formatted = camelCaseToWords(segment);
    
    // Then handle kebab-case (hyphens) and capitalize
    formatted = formatted
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    return formatted;
  };
  
  // Get page title from the last breadcrumb
  const breadcrumbs = generateBreadcrumbs();
  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const title = currentPage?.label || "Dashboard";

  return (
    <div className="flex flex-col gap-4 px-4 py-4 border-b bg-white dark:bg-zinc-900 sm:px-6">
      {/* Top row with title and buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 sm:hidden">
            {pathname}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {headerButtons.map((btn, idx) => (
            <Button 
              key={idx} 
              onClick={btn.onClick} 
              variant="outline"
              size="sm"
              className="hidden sm:flex"
            >
              {btn.label}
            </Button>
          ))}
          {/* Mobile dropdown for buttons when there are many */}
          {headerButtons.length > 0 && (
            <div className="sm:hidden">
              {headerButtons.slice(0, 1).map((btn, idx) => (
                <Button 
                  key={idx} 
                  onClick={btn.onClick} 
                  variant="outline"
                  size="sm"
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Breadcrumb navigation */}
      <div className="hidden sm:block">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {crumb.isActive ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      {/* Mobile breadcrumb - simplified */}
      <div className="sm:hidden">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.length > 1 && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/Dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPage?.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
            {breadcrumbs.length === 1 && (
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}