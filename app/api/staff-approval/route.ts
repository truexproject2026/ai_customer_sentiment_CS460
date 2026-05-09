import { NextResponse } from "next/server";
import { getApprovedReplies, saveApprovedReplies } from "@/lib/kv-service";

type ApprovedReply = {
  comment: string;
  reply: string;
  sentiment: string;
  approvedAt: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { comment, reply, sentiment } = body;

    // Validate input
    if (
      typeof comment !== "string" ||
      typeof reply !== "string" ||
      typeof sentiment !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid input: comment, reply, and sentiment are required" },
        { status: 400 }
      );
    }

    const approved = await getApprovedReplies();

    const newApproval: ApprovedReply = {
      comment,
      reply,
      sentiment,
      approvedAt: new Date().toISOString(),
    };

    approved.push(newApproval);
    await saveApprovedReplies(approved);

    return NextResponse.json({
      success: true,
      message: "Reply approved and saved",
    });
  } catch (error) {
    console.error("Error saving approval:", error);
    return NextResponse.json(
      {
        error: "Failed to save approval",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
