import { createLogger } from "../utils/logger.js";

const logger = createLogger("woocommerce");

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
  }>;
}

export interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  shipping_lines: Array<{
    method_title: string;
    total: string;
  }>;
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * WooCommerce integration for order and product data
 */
export class WooCommerceIntegration {
  private config: WooCommerceConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: WooCommerceConfig) {
    this.config = config;
    const version = config.version || "wc/v3";
    this.baseUrl = `${config.url.replace(/\/$/, "")}/wp-json/${version}`;

    // Basic auth header
    this.authHeader =
      "Basic " +
      Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  }

  /**
   * Make an API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit = 10): Promise<WooCommerceProduct[]> {
    logger.info({ query, limit }, "Searching products");

    return this.request<WooCommerceProduct[]>(
      `/products?search=${encodeURIComponent(query)}&per_page=${limit}`
    );
  }

  /**
   * Get product by ID or SKU
   */
  async getProduct(identifier: string): Promise<WooCommerceProduct | null> {
    logger.info({ identifier }, "Getting product");

    try {
      // Try by ID first
      const productId = parseInt(identifier, 10);
      if (!isNaN(productId)) {
        return await this.request<WooCommerceProduct>(`/products/${productId}`);
      }

      // Try by SKU
      const products = await this.request<WooCommerceProduct[]>(
        `/products?sku=${encodeURIComponent(identifier)}`
      );

      if (products.length > 0) {
        return products[0];
      }

      // Try by slug
      const bySlug = await this.request<WooCommerceProduct[]>(
        `/products?slug=${encodeURIComponent(identifier)}`
      );

      return bySlug.length > 0 ? bySlug[0] : null;
    } catch (error) {
      logger.warn({ identifier, error }, "Product not found");
      return null;
    }
  }

  /**
   * Get order by ID or order number
   */
  async getOrder(orderId: string): Promise<WooCommerceOrder | null> {
    logger.info({ orderId }, "Getting order");

    try {
      // Try by ID
      const id = parseInt(orderId.replace("#", ""), 10);
      if (!isNaN(id)) {
        return await this.request<WooCommerceOrder>(`/orders/${id}`);
      }

      // Search by order number
      const orders = await this.request<WooCommerceOrder[]>(
        `/orders?number=${encodeURIComponent(orderId)}`
      );

      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.warn({ orderId, error }, "Order not found");
      return null;
    }
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByEmail(email: string, limit = 5): Promise<WooCommerceOrder[]> {
    logger.info({ email, limit }, "Getting orders by email");

    try {
      return await this.request<WooCommerceOrder[]>(
        `/orders?search=${encodeURIComponent(email)}&per_page=${limit}`
      );
    } catch (error) {
      logger.warn({ email, error }, "Failed to get orders by email");
      return [];
    }
  }

  /**
   * Get tracking info (requires WooCommerce Shipment Tracking plugin)
   */
  async getTracking(orderId: string): Promise<{ url?: string; number?: string } | null> {
    const order = await this.getOrder(orderId);

    if (!order) return null;

    // Look for tracking in meta_data (common tracking plugin format)
    const trackingMeta = order.meta_data.find(
      (m) =>
        m.key === "_wc_shipment_tracking_items" ||
        m.key === "tracking_number" ||
        m.key === "_tracking_number"
    );

    if (trackingMeta) {
      try {
        const tracking = JSON.parse(trackingMeta.value);
        if (Array.isArray(tracking) && tracking.length > 0) {
          return {
            number: tracking[0].tracking_number,
            url: tracking[0].tracking_link,
          };
        }
      } catch {
        // Not JSON, might be just the tracking number
        return { number: trackingMeta.value };
      }
    }

    return null;
  }

  /**
   * Get order notes
   */
  async getOrderNotes(orderId: string): Promise<string[]> {
    try {
      const notes = await this.request<Array<{ note: string }>>(
        `/orders/${orderId}/notes`
      );
      return notes.map((n) => n.note);
    } catch {
      return [];
    }
  }
}
