import { createLogger } from "../utils/logger.js";

const logger = createLogger("whatsapp");

export interface WhatsAppConfig {
  phoneNumber?: string;
  sessionPath: string;
}

export class WhatsAppChannel {
  private config: WhatsAppConfig;
  private isConnected = false;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    logger.info("Connecting to WhatsApp...");
    // TODO: Implement Baileys connection
    this.isConnected = true;
    logger.info("WhatsApp connected");
  }

  async disconnect(): Promise<void> {
    logger.info("Disconnecting from WhatsApp...");
    this.isConnected = false;
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.isConnected) throw new Error("WhatsApp not connected");
    logger.info({ to, text }, "Sending WhatsApp message");
  }

  onMessage(handler: (from: string, text: string, metadata: unknown) => void): void {
    logger.info("Message handler registered");
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
