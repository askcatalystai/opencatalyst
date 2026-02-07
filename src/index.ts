/**
 * OpenCatalyst - AI-powered ecommerce assistant
 */

export { createCatalyst, type CatalystConfig, type IncomingMessage, type OutgoingMessage } from "./gateway/catalyst.js";
export { CustomerAgent } from "./agents/customer.js";
export { MemoryStore } from "./memory/store.js";
export { WhatsAppChannel } from "./channels/whatsapp.js";
export { EmailChannel } from "./channels/email.js";
export { WebChatChannel } from "./channels/webchat.js";
export { ShopifyIntegration } from "./integrations/shopify.js";
export { MedusaIntegration } from "./integrations/medusa.js";
export { WooCommerceIntegration } from "./integrations/woocommerce.js";
export { loadConfig, saveConfig, createDefaultConfig, type Config } from "./config/config.js";
export { createLogger } from "./utils/logger.js";
