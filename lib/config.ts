export interface Config {
  store: { name: string; url?: string };
  ai: { provider: string; model: string };
  agent: { name: string; greeting: string; personality?: string };
}

export function getConfig(): Config {
  return {
    store: {
      name: process.env.STORE_NAME || "My Store",
      url: process.env.STORE_URL,
    },
    ai: {
      provider: process.env.AI_PROVIDER || "anthropic",
      model: process.env.AI_MODEL || "claude-sonnet-4-20250514",
    },
    agent: {
      name: process.env.AGENT_NAME || "Catalyst",
      greeting: process.env.AGENT_GREETING || "Hi! How can I help you today?",
      personality: process.env.AGENT_PERSONALITY,
    },
  };
}
