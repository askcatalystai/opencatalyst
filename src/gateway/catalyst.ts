import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createLogger } from "../utils/logger.js";
import type { Config } from "../config/config.js";
import { CustomerAgent, type IncomingMessage, type OutgoingMessage } from "../agents/customer.js";
import { MemoryStore } from "../memory/store.js";

const logger = createLogger("gateway");

export interface CatalystConfig {
  config: Config;
  onMessage?: (message: IncomingMessage) => void;
  onError?: (error: Error) => void;
}

export { IncomingMessage, OutgoingMessage };

export function createCatalyst(options: CatalystConfig) {
  const { config } = options;
  const app = new Hono();
  const memory = new MemoryStore(config.memory);
  const agent = new CustomerAgent(config, memory);

  if (config.gateway.cors) {
    app.use("/*", cors());
  }

  app.get("/health", (c) => c.json({
    status: "ok",
    store: config.store.name,
    platform: config.store.platform,
    timestamp: new Date().toISOString(),
  }));

  app.get("/", (c) => c.json({
    name: "OpenCatalyst",
    version: "0.1.0",
    store: config.store.name,
    agent: config.agent.name,
    channels: {
      whatsapp: config.channels.whatsapp?.enabled ?? false,
      email: config.channels.email?.enabled ?? false,
      webchat: config.channels.webchat?.enabled ?? false,
    },
  }));

  app.post("/api/chat", async (c) => {
    try {
      const body = await c.req.json<{
        message: string;
        sessionId: string;
        customerInfo?: { email?: string; name?: string };
      }>();

      const response = await agent.handleMessage({
        channel: "webchat",
        from: body.sessionId,
        text: body.message,
        timestamp: new Date(),
        metadata: { customerInfo: body.customerInfo },
      });

      return c.json({ success: true, response: response.text, sessionId: body.sessionId });
    } catch (error) {
      logger.error({ error }, "Chat API error");
      return c.json({ success: false, error: "Internal error" }, 500);
    }
  });

  app.get("/api/chat/:sessionId/history", async (c) => {
    const sessionId = c.req.param("sessionId");
    const history = await memory.getConversation(sessionId);
    return c.json({ sessionId, messages: history });
  });

  app.post("/webhook/:channel", async (c) => {
    const channel = c.req.param("channel") as IncomingMessage["channel"];
    const body = await c.req.json();

    logger.info({ channel }, "Webhook received");

    setImmediate(async () => {
      try {
        const message: IncomingMessage = {
          channel,
          from: body.from || body.sender,
          text: body.text || body.message || body.body,
          timestamp: new Date(),
          metadata: body,
        };
        options.onMessage?.(message);
        await agent.handleMessage(message);
      } catch (error) {
        options.onError?.(error as Error);
      }
    });

    return c.json({ received: true });
  });

  app.get("/api/products/search", async (c) => {
    const query = c.req.query("q");
    if (!query) return c.json({ error: "Query required" }, 400);
    const products = await agent.searchProducts(query);
    return c.json({ products });
  });

  app.get("/api/orders/:orderId", async (c) => {
    const order = await agent.getOrder(c.req.param("orderId"));
    if (!order) return c.json({ error: "Not found" }, 404);
    return c.json({ order });
  });

  const start = () => {
    const { port, host } = config.gateway;
    serve({ fetch: app.fetch, port, hostname: host }, (info) => {
      logger.info(`🚀 OpenCatalyst running at http://${host}:${info.port}`);
      logger.info(`📦 Store: ${config.store.name} (${config.store.platform})`);
      logger.info(`🤖 Agent: ${config.agent.name}`);
    });
    return { app, agent, memory };
  };

  return { app, agent, memory, start };
}
