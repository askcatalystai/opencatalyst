import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/config.js";
import type { MemoryStore } from "../memory/store.js";

const logger = createLogger("agent");

export interface IncomingMessage {
  channel: "whatsapp" | "email" | "webchat";
  from: string;
  text: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface OutgoingMessage {
  channel: "whatsapp" | "email" | "webchat";
  to: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export class CustomerAgent {
  private config: Config;
  private memory: MemoryStore;
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor(config: Config, memory: MemoryStore) {
    this.config = config;
    this.memory = memory;

    if (config.ai.provider === "anthropic") {
      this.anthropic = new Anthropic({ apiKey: config.ai.apiKey });
    } else {
      this.openai = new OpenAI({ apiKey: config.ai.apiKey });
    }
  }

  private buildSystemPrompt(): string {
    const { store, agent } = this.config;
    const capabilities = agent.capabilities
      .map((cap) => {
        switch (cap) {
          case "orders": return "- Track orders by order number or email";
          case "products": return "- Search products and check availability";
          case "support": return "- Answer questions and provide support";
          case "returns": return "- Help with returns and refunds";
          case "recommendations": return "- Provide personalized recommendations";
          default: return "";
        }
      })
      .filter(Boolean)
      .join("\n");

    return `You are ${agent.name}, a helpful AI assistant for ${store.name}.

You can:
${capabilities}

Be friendly, helpful, and concise. ${agent.personality || ""}
${this.config.ai.systemPrompt || ""}`;
  }

  async handleMessage(message: IncomingMessage): Promise<OutgoingMessage> {
    const { channel, from, text } = message;
    const history = await this.memory.getConversation(from);
    await this.memory.addMessage(from, { role: "user", content: text });

    try {
      const response = await this.generateResponse(text, history);
      await this.memory.addMessage(from, { role: "assistant", content: response });
      return { channel, to: from, text: response };
    } catch (error) {
      logger.error({ error, from }, "Failed to generate response");
      return { channel, to: from, text: "Sorry, I'm having trouble. Please try again." };
    }
  }

  private async generateResponse(
    message: string,
    history: Array<{ role: string; content: string }>
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();

    if (this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.config.ai.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: message },
        ],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text || "I couldn't generate a response.";
    }

    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.ai.model || "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: message },
        ],
      });
      return response.choices[0]?.message?.content || "I couldn't generate a response.";
    }

    throw new Error("No AI provider configured");
  }

  async searchProducts(query: string): Promise<unknown[]> {
    logger.info({ query }, "Searching products");
    return [];
  }

  async getOrder(orderId: string): Promise<unknown | null> {
    logger.info({ orderId }, "Looking up order");
    return null;
  }
}
