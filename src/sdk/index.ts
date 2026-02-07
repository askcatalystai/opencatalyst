/**
 * OpenCatalyst SDK
 */

export { CustomerAgent } from "../agents/customer.js";
export { MemoryStore } from "../memory/store.js";
export { loadConfig, type Config } from "../config/config.js";
export { createLogger } from "../utils/logger.js";

// Integrations
export { ShopifyIntegration, type ShopifyConfig, type ShopifyProduct, type ShopifyOrder } from "../integrations/shopify.js";
export { MedusaIntegration, type MedusaConfig, type MedusaProduct, type MedusaOrder } from "../integrations/medusa.js";
export { WooCommerceIntegration, type WooCommerceConfig, type WooCommerceProduct, type WooCommerceOrder } from "../integrations/woocommerce.js";

// Channels
export { WhatsAppChannel } from "../channels/whatsapp.js";
export { EmailChannel } from "../channels/email.js";
export { WebChatChannel } from "../channels/webchat.js";

// Types
export type { IncomingMessage, OutgoingMessage, CatalystConfig } from "../gateway/catalyst.js";
