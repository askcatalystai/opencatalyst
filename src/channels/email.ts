import { createLogger } from "../utils/logger.js";

const logger = createLogger("email");

export class EmailChannel {
  async start(): Promise<void> {
    logger.info("Starting email channel...");
  }

  async stop(): Promise<void> {
    logger.info("Stopping email channel...");
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    logger.info({ to, subject }, "Sending email");
  }

  onEmail(handler: (from: string, subject: string, body: string) => void): void {
    logger.info("Email handler registered");
  }
}
