import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getConfig } from "./config";
import { getMemory, saveMemory } from "./memory";

const config = getConfig();

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function buildSystemPrompt(): string {
  return `You are ${config.agent.name}, a helpful AI assistant for ${config.store.name}.

Help customers with:
- Finding products and checking availability
- Tracking orders and shipments
- Answering questions about products, shipping, returns

Be friendly, helpful, and concise. Keep responses under 150 words.
${config.agent.personality || ""}`;
}

export async function chat(
  sessionId: string,
  userMessage: string
): Promise<{ response: string; sessionId: string }> {
  const memory = await getMemory(sessionId);
  const messages = memory.messages;
  
  messages.push({ role: "user", content: userMessage });

  let response = "";

  if (anthropic) {
    const result = await anthropic.messages.create({
      model: config.ai.model,
      max_tokens: 1024,
      system: buildSystemPrompt(),
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const textBlock = result.content.find((b) => b.type === "text");
    response = textBlock?.text || "I'm not sure how to respond.";
  } else if (openai) {
    const result = await openai.chat.completions.create({
      model: config.ai.model || "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    response = result.choices[0]?.message?.content || "I'm not sure how to respond.";
  } else {
    response = "AI is not configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY.";
  }

  messages.push({ role: "assistant", content: response });
  await saveMemory(sessionId, { ...memory, messages });

  return { response, sessionId };
}
