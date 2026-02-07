import fs from "node:fs";
import path from "node:path";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/config.js";

const logger = createLogger("memory");

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

interface Conversation {
  id: string;
  messages: Message[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export class MemoryStore {
  private config: Config["memory"];
  private conversations: Map<string, Conversation> = new Map();
  private storagePath: string;

  constructor(config: Config["memory"]) {
    this.config = config;
    this.storagePath = path.resolve(process.cwd(), config.path);

    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    this.loadFromDisk();
  }

  async getConversation(sessionId: string): Promise<Message[]> {
    return this.conversations.get(sessionId)?.messages || [];
  }

  async addMessage(sessionId: string, message: Omit<Message, "timestamp">): Promise<void> {
    const now = Date.now();
    let conversation = this.conversations.get(sessionId);

    if (!conversation) {
      conversation = { id: sessionId, messages: [], createdAt: now, updatedAt: now };
      this.conversations.set(sessionId, conversation);
    }

    conversation.messages.push({ ...message, timestamp: now });
    conversation.updatedAt = now;
    await this.saveToDisk(sessionId, conversation);
  }

  async clearConversation(sessionId: string): Promise<void> {
    this.conversations.delete(sessionId);
    const filePath = path.join(this.storagePath, `${sessionId.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  private async saveToDisk(sessionId: string, conversation: Conversation): Promise<void> {
    try {
      const filePath = path.join(this.storagePath, `${sessionId.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`);
      fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    } catch (error) {
      logger.error({ error, sessionId }, "Failed to save conversation");
    }
  }

  private loadFromDisk(): void {
    try {
      const files = fs.readdirSync(this.storagePath);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = fs.readFileSync(path.join(this.storagePath, file), "utf-8");
          const conversation = JSON.parse(content) as Conversation;
          this.conversations.set(conversation.id, conversation);
        } catch {}
      }
      logger.info(`Loaded ${this.conversations.size} conversations`);
    } catch {}
  }

  getStats() {
    let messages = 0;
    for (const c of this.conversations.values()) messages += c.messages.length;
    return { conversations: this.conversations.size, messages };
  }
}
