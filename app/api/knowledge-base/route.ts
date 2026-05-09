import { NextResponse } from "next/server";
import { getBrandConfig, saveBrandConfig } from "@/lib/kv-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    const data = await getBrandConfig();
    const venueData = data.brands[venueId] || { examples: [] };
    
    return NextResponse.json(venueData.examples || []);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Failed to load training data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { venueId, review, reply } = await req.json();
    if (!venueId || !review || !reply) {
      return NextResponse.json({ error: "venueId, review, and reply are required" }, { status: 400 });
    }

    const data = await getBrandConfig();
    if (!data.brands[venueId]) {
      data.brands[venueId] = { examples: [] };
    }
    
    data.brands[venueId].examples.unshift({ review, reply });
    await saveBrandConfig(data);

    return NextResponse.json({ success: true, examples: data.brands[venueId].examples });
  } catch (error) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Failed to add training data" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { venueId, index } = await req.json();
    if (!venueId || typeof index !== "number") {
      return NextResponse.json({ error: "venueId and index are required" }, { status: 400 });
    }

    const data = await getBrandConfig();
    
    if (data.brands[venueId] && data.brands[venueId].examples && data.brands[venueId].examples[index]) {
      data.brands[venueId].examples.splice(index, 1);
      await saveBrandConfig(data);
      return NextResponse.json({ success: true, examples: data.brands[venueId].examples });
    }
    
    return NextResponse.json({ error: "Example not found" }, { status: 404 });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Failed to delete training data" }, { status: 500 });
  }
}
