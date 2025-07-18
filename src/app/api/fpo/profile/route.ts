import { getFpoProfile, updateFpoProfile, updateFpoProfileWithLogo } from "@/server/features/fpo/infrastructure/persistence/FpoProfileSupabase";
import { NextResponse } from "next/server";
import { FpoProfile } from "@/server/features/fpo/core/entities/FpoProfile";

export async function GET() {
  try {
    const fpoProfile = await getFpoProfile()();
    if (!fpoProfile) {
      return NextResponse.json({ error: "FPO profile not found" }, { status: 404 });
    }
    return NextResponse.json(fpoProfile);
  } catch (error) {
    console.error("Error fetching FPO profile:", error);
    return NextResponse.json({ error: "Failed to fetch FPO profile" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Extract profile data
    const profileDataString = formData.get('profileData') as string;
    const profileData = JSON.parse(profileDataString);
    
    // Extract logo file if present
    const logoFile = formData.get('logoFile') as File | null;
    
    const fpoProfile = new FpoProfile(profileData);
    
    let updatedProfile;
    
    if (logoFile) {
      // Use updateFpoProfileWithLogo for logo uploads
      updatedProfile = await updateFpoProfileWithLogo(fpoProfile, logoFile)();
    } else {
      // Use regular updateFpoProfile for no logo
      updatedProfile = await updateFpoProfile(fpoProfile)();
    }
    
    if (!updatedProfile) {
      return NextResponse.json({ error: "Failed to update FPO profile" }, { status: 500 });
    }
    
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating FPO profile:", error);
    return NextResponse.json({ error: "Failed to update FPO profile" }, { status: 500 });
  }
}