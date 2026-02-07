import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/agent";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, customerInfo } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Use provided sessionId or generate one
    const sid = sessionId || nanoid();

    // Get response from agent
    const result = await chat(sid, message);

    return NextResponse.json({
      success: true,
      response: result.response,
      sessionId: result.sessionId,
    });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  
  if (!sessionId) {
    return NextResponse.json({ 
      greeting: process.env.AGENT_GREETING || "Hi! How can I help you today?",
      agentName: process.env.AGENT_NAME || "Catalyst",
    });
  }

  // Get conversation history
  const { getMemory } = await import("@/lib/memory");
  const memory = await getMemory(sessionId);

  return NextResponse.json({
    sessionId,
    messages: memory.messages,
    customer: memory.customer,
  });
}
