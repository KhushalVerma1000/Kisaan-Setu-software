import { Unit } from "@/server/features/items/core/entities/Unit";
import { getAllUnits , createUnit } from "@/server/features/items/infrastructure/persistence/ItemSupabase";
import { error } from "console";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request:NextRequest) {

    try {
          const { searchParams } = new URL(request.url)
    const fpo_id = searchParams.get('fpo_id')
        if(!fpo_id){
            return NextResponse.json({error:"FPO ID is required"})
        }
        const units = await getAllUnits(fpo_id)
        return NextResponse.json({units})
    } catch (error) {
        console.error('Error fetching units:', error)
        return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
        
    }
   
}

export async function POST(request:NextRequest){

    try {
        const {code , label , fpo_id} = await request.json()
        const newUnit = new Unit(code,label)
        const createdunit = await createUnit(newUnit,fpo_id)
        return NextResponse.json({unit:createdunit})
    } catch (error) {
  if (error instanceof Error) {
    console.error("Error creating unit:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    console.error("Unknown error:", error);
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }     
    }

}