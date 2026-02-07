/**
 * Composio integration for connecting to Shopify, WooCommerce, etc.
 * 
 * Composio provides pre-built integrations with 250+ apps.
 * https://composio.dev
 */

interface ComposioTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface ComposioActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Lazy load Composio to avoid build errors if not installed
let composioClient: unknown = null;

async function getComposio() {
  if (!process.env.COMPOSIO_API_KEY) {
    console.log("[Composio] No API key configured");
    return null;
  }

  if (!composioClient) {
    try {
      const { Composio } = await import("composio-core");
      composioClient = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
    } catch (error) {
      console.error("[Composio] Failed to initialize:", error);
      return null;
    }
  }

  return composioClient;
}

/**
 * Get available Composio tools for an entity (user/connection)
 */
export async function getComposioTools(entityId?: string): Promise<ComposioTool[]> {
  const composio = await getComposio();
  if (!composio) return [];

  try {
    // Get tools for connected apps
    const toolset = await (composio as { getToolSet: (opts: { apps: string[] }) => Promise<{ tools: ComposioTool[] }> }).getToolSet({
      apps: ["shopify", "woocommerce", "gmail"],
    });

    return toolset.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  } catch (error) {
    console.error("[Composio] Failed to get tools:", error);
    return [];
  }
}

/**
 * Execute a Composio action
 */
export async function executeComposioAction(
  actionName: string,
  params: Record<string, unknown>,
  entityId?: string
): Promise<ComposioActionResult> {
  const composio = await getComposio();
  if (!composio) {
    return { success: false, error: "Composio not configured" };
  }

  try {
    const result = await (composio as { executeAction: (opts: { action: string; params: Record<string, unknown>; entityId?: string }) => Promise<unknown> }).executeAction({
      action: actionName,
      params,
      entityId,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error(`[Composio] Action ${actionName} failed:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get OAuth URL for connecting an app
 */
export async function getConnectUrl(
  app: string,
  entityId: string,
  redirectUrl: string
): Promise<string | null> {
  const composio = await getComposio();
  if (!composio) return null;

  try {
    const entity = await (composio as { getEntity: (id: string) => Promise<{ initiateConnection: (opts: { appName: string; redirectUrl: string }) => Promise<{ url: string }> }> }).getEntity(entityId);
    const connection = await entity.initiateConnection({
      appName: app,
      redirectUrl,
    });
    return connection.url;
  } catch (error) {
    console.error(`[Composio] Failed to get connect URL for ${app}:`, error);
    return null;
  }
}

/**
 * Check if an app is connected for an entity
 */
export async function isAppConnected(
  app: string,
  entityId: string
): Promise<boolean> {
  const composio = await getComposio();
  if (!composio) return false;

  try {
    const entity = await (composio as { getEntity: (id: string) => Promise<{ getConnection: (opts: { app: string }) => Promise<{ status: string }> }> }).getEntity(entityId);
    const connection = await entity.getConnection({ app });
    return connection.status === "ACTIVE";
  } catch {
    return false;
  }
}

// Pre-defined action mappings for ecommerce
export const ECOMMERCE_ACTIONS = {
  // Shopify
  SHOPIFY_GET_ORDER: "SHOPIFY_GET_ORDER",
  SHOPIFY_SEARCH_PRODUCTS: "SHOPIFY_LIST_PRODUCTS",
  SHOPIFY_GET_CUSTOMER: "SHOPIFY_GET_CUSTOMER",
  SHOPIFY_GET_INVENTORY: "SHOPIFY_GET_INVENTORY_LEVELS",
  
  // WooCommerce
  WOOCOMMERCE_GET_ORDER: "WOOCOMMERCE_GET_ORDER",
  WOOCOMMERCE_SEARCH_PRODUCTS: "WOOCOMMERCE_LIST_PRODUCTS",
  
  // Gmail (for email)
  GMAIL_SEND_EMAIL: "GMAIL_SEND_EMAIL",
  GMAIL_GET_EMAILS: "GMAIL_GET_MESSAGES",
};
