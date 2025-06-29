import { getFpoProfile, updateFpoProfile } from "@/server/features/fpo/infrastructure/persistence/FpoProfileSupabase";
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
    const profileData = await request.json();
    const fpoProfile = new FpoProfile(profileData);
    const updatedProfile = await updateFpoProfile(fpoProfile)();
    if (!updatedProfile) {
      return NextResponse.json({ error: "Failed to update FPO profile" }, { status: 500 });
    }
    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating FPO profile:", error);
    return NextResponse.json({ error: "Failed to update FPO profile" }, { status: 500 });
  }
}