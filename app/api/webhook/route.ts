import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Webhook endpoint for incoming messages from various channels
 * POST /api/webhook?channel=whatsapp|email
 */
export async function POST(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel") || "unknown";
  
  try {
    const body = await request.json();
    
    console.log(`[Webhook] ${channel}:`, body);

    // Extract message based on channel format
    let message: string;
    let sessionId: string;
    let replyTo: string | null = null;

    switch (channel) {
      case "whatsapp":
        // WhatsApp webhook format (varies by provider)
        message = body.text || body.message?.text || body.Body;
        sessionId = body.from || body.From || body.sender;
        replyTo = body.from || body.From;
        break;

      case "email":
        // Email webhook format (from services like Resend, SendGrid)
        message = body.text || body.plain || body.body;
        sessionId = body.from || body.sender || body.envelope?.from;
        replyTo = body.from;
        break;

      case "telegram":
        message = body.message?.text;
        sessionId = String(body.message?.chat?.id);
        break;

      default:
        message = body.message || body.text || body.content;
        sessionId = body.sessionId || body.from || body.sender || "unknown";
    }

    if (!message) {
      return NextResponse.json(
        { error: "No message content found" },
        { status: 400 }
      );
    }

    // Process with agent
    const result = await chat(sessionId, message);

    // Return response (channel-specific delivery would happen here)
    return NextResponse.json({
      success: true,
      channel,
      sessionId: result.sessionId,
      response: result.response,
      replyTo,
    });
  } catch (error) {
    console.error(`[Webhook] ${channel} error:`, error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Webhook verification for some platforms
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel");
  
  // WhatsApp verification (Meta)
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  // Generic health check
  return NextResponse.json({
    status: "ok",
    channel,
    timestamp: new Date().toISOString(),
  });
}
