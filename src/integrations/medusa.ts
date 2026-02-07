import { createLogger } from "../utils/logger.js";

const logger = createLogger("medusa");

export interface MedusaConfig {
  backendUrl: string;
  apiKey?: string;
  publishableKey?: string;
}

export interface MedusaProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string;
  variants: Array<{
    id: string;
    title: string;
    prices: Array<{
      amount: number;
      currency_code: string;
    }>;
    inventory_quantity: number;
  }>;
}

export interface MedusaOrder {
  id: string;
  display_id: number;
  email: string;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  total: number;
  currency_code: string;
  created_at: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  shipping_address?: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    country_code: string;
    postal_code: string;
  };
  fulfillments?: Array<{
    tracking_links: Array<{
      url: string;
      tracking_number: string;
    }>;
  }>;
}

/**
 * Medusa integration for order and product data
 */
export class MedusaIntegration {
  private config: MedusaConfig;
  private baseUrl: string;

  constructor(config: MedusaConfig) {
    this.config = config;
    this.baseUrl = config.backendUrl.replace(/\/$/, "");
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isAdmin = false
  ): Promise<T> {
    const url = `${this.baseUrl}${isAdmin ? "/admin" : "/store"}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isAdmin && this.config.apiKey) {
      headers["x-medusa-access-token"] = this.config.apiKey;
    }

    if (!isAdmin && this.config.publishableKey) {
      headers["x-publishable-api-key"] = this.config.publishableKey;
    }

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Medusa API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit = 10): Promise<MedusaProduct[]> {
    logger.info({ query, limit }, "Searching products");

    const data = await this.request<{ products: MedusaProduct[] }>(
      `/products?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    return data.products;
  }

  /**
   * Get product by ID or handle
   */
  async getProduct(identifier: string): Promise<MedusaProduct | null> {
    logger.info({ identifier }, "Getting product");

    try {
      // Try by handle first (more user-friendly)
      const data = await this.request<{ products: MedusaProduct[] }>(
        `/products?handle=${encodeURIComponent(identifier)}`
      );

      if (data.products.length > 0) {
        return data.products[0];
      }

      // Try by ID
      const byId = await this.request<{ product: MedusaProduct }>(
        `/products/${identifier}`
      );
      return byId.product;
    } catch (error) {
      logger.warn({ identifier, error }, "Product not found");
      return null;
    }
  }

  /**
   * Get order by ID or display ID
   */
  async getOrder(orderId: string): Promise<MedusaOrder | null> {
    logger.info({ orderId }, "Getting order");

    try {
      // Admin API for order lookup
      const data = await this.request<{ order: MedusaOrder }>(
        `/orders/${orderId}`,
        {},
        true
      );
      return data.order;
    } catch {
      // Try by display ID
      try {
        const displayId = parseInt(orderId.replace("#", ""), 10);
        if (!isNaN(displayId)) {
          const data = await this.request<{ orders: MedusaOrder[] }>(
            `/orders?display_id=${displayId}`,
            {},
            true
          );
          if (data.orders.length > 0) {
            return data.orders[0];
          }
        }
      } catch (error) {
        logger.warn({ orderId, error }, "Order not found");
      }
      return null;
    }
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByEmail(email: string, limit = 5): Promise<MedusaOrder[]> {
    logger.info({ email, limit }, "Getting orders by email");

    // Need to find customer first, then get their orders
    try {
      const customerData = await this.request<{ customers: Array<{ id: string }> }>(
        `/customers?email=${encodeURIComponent(email)}`,
        {},
        true
      );

      if (customerData.customers.length === 0) {
        return [];
      }

      const customerId = customerData.customers[0].id;
      const ordersData = await this.request<{ orders: MedusaOrder[] }>(
        `/orders?customer_id=${customerId}&limit=${limit}`,
        {},
        true
      );

      return ordersData.orders;
    } catch (error) {
      logger.warn({ email, error }, "Failed to get orders by email");
      return [];
    }
  }

  /**
   * Get tracking info for an order
   */
  async getTracking(orderId: string): Promise<{ url?: string; number?: string } | null> {
    const order = await this.getOrder(orderId);

    if (order?.fulfillments && order.fulfillments.length > 0) {
      const links = order.fulfillments[0].tracking_links;
      if (links && links.length > 0) {
        return {
          url: links[0].url,
          number: links[0].tracking_number,
        };
      }
    }

    return null;
  }
}
