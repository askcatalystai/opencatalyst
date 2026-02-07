import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("config");

const ConfigSchema = z.object({
  store: z.object({
    name: z.string(),
    platform: z.enum(["shopify", "woocommerce", "medusa", "custom"]),
    url: z.string().url(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
  }),
  ai: z.object({
    provider: z.enum(["anthropic", "openai"]).default("anthropic"),
    model: z.string().default("claude-sonnet-4-20250514"),
    apiKey: z.string(),
    systemPrompt: z.string().optional(),
  }),
  channels: z.object({
    whatsapp: z.object({
      enabled: z.boolean().default(false),
      phoneNumber: z.string().optional(),
      sessionPath: z.string().default("./.catalyst/whatsapp"),
    }).optional(),
    email: z.object({
      enabled: z.boolean().default(false),
    }).optional(),
    webchat: z.object({
      enabled: z.boolean().default(false),
      widgetId: z.string().optional(),
    }).optional(),
  }).default({}),
  gateway: z.object({
    port: z.number().default(3939),
    host: z.string().default("0.0.0.0"),
    cors: z.boolean().default(true),
  }).default({}),
  memory: z.object({
    provider: z.enum(["local", "redis"]).default("local"),
    path: z.string().default("./.catalyst/memory"),
    ttl: z.number().default(86400 * 7),
  }).default({}),
  agent: z.object({
    name: z.string().default("Catalyst"),
    greeting: z.string().default("Hi! How can I help you today?"),
    personality: z.string().optional(),
    capabilities: z.array(z.enum(["orders", "products", "support", "returns", "recommendations"])).default(["orders", "products", "support"]),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

const CONFIG_PATHS = ["catalyst.config.json", "catalyst.json", ".catalyst/config.json"];

export function loadConfig(configPath?: string): Config {
  let rawConfig: Record<string, unknown> = {};
  const searchPaths = configPath ? [configPath] : CONFIG_PATHS;

  for (const searchPath of searchPaths) {
    const fullPath = path.resolve(process.cwd(), searchPath);
    if (fs.existsSync(fullPath)) {
      logger.info(`Loading config from ${fullPath}`);
      rawConfig = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      break;
    }
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY) {
    rawConfig.ai = {
      ...(rawConfig.ai as object),
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
      provider: process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai",
    };
  }

  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw new Error(`Invalid config: ${result.error.errors.map(e => e.message).join(", ")}`);
  }
  return result.data;
}

export function saveConfig(config: Config, configPath = "catalyst.config.json"): void {
  fs.writeFileSync(path.resolve(process.cwd(), configPath), JSON.stringify(config, null, 2));
}

export function createDefaultConfig(storeName: string, platform: string): Config {
  return {
    store: { name: storeName, platform: platform as Config["store"]["platform"], url: "https://your-store.com" },
    ai: { provider: "anthropic", model: "claude-sonnet-4-20250514", apiKey: "" },
    channels: { webchat: { enabled: true } },
    gateway: { port: 3939, host: "0.0.0.0", cors: true },
    memory: { provider: "local", path: "./.catalyst/memory", ttl: 604800 },
    agent: { name: "Catalyst", greeting: `Hi! Welcome to ${storeName}!`, capabilities: ["orders", "products", "support"] },
  };
}
