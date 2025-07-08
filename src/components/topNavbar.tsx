"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface TopNavbarProps {
  className?: string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ className = "" }) => {
  return (
    <header
      className={`w-full h-16 border-b border-[hsl(var(--sidebar-border))] bg-background flex items-center justify-between px-4 md:px-6 ${className}`}
    >
      {/* Left side: Company logo and name */}
      <div className="flex items-center gap-3">
        {/* Company Logo */}
        <div className="h-8 w-8 rounded-md bg-[hsl(var(--sidebar-primary))] flex items-center justify-center transition-transform duration-200 hover:scale-105">
          <div className="h-8 w-8 overflow-hidden rounded-md">
            <Image
              src="/Logo.jpeg"
              alt="Company Logo"
              className="h-full w-full object-contain"
              width={32}
              height={32}
            />
          </div>
        </div>

        {/* Company Name */}
        <Link
          href="/"
          className="font-bold text-lg hover:text-[hsl(var(--sidebar-primary))] transition-colors duration-200"
        >
          Kissan Setu
        </Link>
      </div>

      {/* Right side: Authentication buttons */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Login Button */}
        <Button
          size="sm"
          className="
            relative overflow-hidden
            bg-[#388E3C]
            hover:bg-[hsl(var(--sidebar-primary))] 
            hover:text-[hsl(var(--sidebar-primary-foreground))]
            transition-all duration-300 ease-in-out
            hover:shadow-md hover:scale-105
            before:absolute before:inset-0 before:bg-[hsl(var(--sidebar-primary))]
            before:translate-x-[-100%] before:transition-transform before:duration-300
            hover:before:translate-x-0
          "
          asChild
        >
          <Link href="/Login" className="relative z-10">
            Login
          </Link>
        </Button>

        {/* Sign Up Button */}
        <Button
          variant="secondary"
          size="sm"
          className="
            relative overflow-hidden

            text-[hsl(var(--sidebar-primary))] 
            border-[hsl(var(--sidebar-primary))] 
            border-1
            hover:bg-[hsl(var(--sidebar-primary))] 
            hover:text-[hsl(var(--sidebar-primary-foreground))]
            hover:border-[hsl(var(--sidebar-primary))]
            transition-all duration-300 ease-in-out
            hover:shadow-lg hover:scale-105
            hover:-translate-y-0.5
            before:absolute before:inset-0 before:bg-[hsl(var(--sidebar-primary))]
            before:translate-y-[100%] before:transition-transform before:duration-300
            hover:before:translate-y-0
          "
          asChild
        >
          <Link href="/Signup" className="relative z-10">
            Sign Up
          </Link>
        </Button>

        {/* Contact Us Button */}
        <Button
          size="sm"
          className="
            relative overflow-hidden
            bg-[#388E3C]
            hover:bg-[hsl(var(--sidebar-primary))] 
            hover:text-[hsl(var(--sidebar-primary-foreground))]
            transition-all duration-300 ease-in-out
            hover:shadow-md hover:scale-105
            before:absolute before:inset-0 before:bg-[hsl(var(--sidebar-primary))]
            before:translate-x-[-100%] before:transition-transform before:duration-300
            hover:before:translate-x-0
   "
          asChild
        >
          <Link
            href="https://sukrshinfotech.com/Contact/"
            className="relative z-10"
          >
            Contact Us
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default TopNavbar;
