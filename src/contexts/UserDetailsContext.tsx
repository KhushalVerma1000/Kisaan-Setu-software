"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client"; // Adjust path if needed

const supabase = createClient()
// Define the shape of your FPO profile (adjust fields as per your table)
export interface FpoProfile {
  id: string;
  company_name: string;
  incorporation_date?: string;
  logo_url?: string;
  ceo_name?: string;
  phone_number?: string;
  invoice_email?: string;
  gst_number?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Add more fields as needed
}

interface UserDetailsContextType {
  profile: FpoProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserDetailsContext = createContext<UserDetailsContextType | undefined>(undefined);

export const UserDetailsProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<FpoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("fpo_profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) {
      setProfile(null);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const refreshProfile = fetchProfile;

  return (
    <UserDetailsContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </UserDetailsContext.Provider>
  );
};

export const useUserDetails = () => {
  const context = useContext(UserDetailsContext);
  if (!context) throw new Error("useUserDetails must be used within a UserDetailsProvider");
  return context;
};