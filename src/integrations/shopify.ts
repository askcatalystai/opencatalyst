import { createLogger } from "../utils/logger.js";

const logger = createLogger("shopify");

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    sku: string;
    available: boolean;
  }>;
  images: Array<{ id: string; src: string; alt: string }>;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  email: string;
  phone?: string;
  createdAt: string;
  fulfillmentStatus: string;
  financialStatus: string;
  totalPrice: string;
  currency: string;
  lineItems: Array<{ title: string; quantity: number; price: string }>;
  shippingAddress?: { name: string; address1: string; city: string; country: string; zip: string };
  trackingUrl?: string;
  trackingNumber?: string;
}

export class ShopifyIntegration {
  private config: ShopifyConfig;
  private baseUrl: string;

  constructor(config: ShopifyConfig) {
    this.config = config;
    const version = config.apiVersion || "2024-01";
    this.baseUrl = `https://${config.storeDomain}/admin/api/${version}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }
    return response.json();
  }

  async searchProducts(query: string, limit = 10): Promise<ShopifyProduct[]> {
    logger.info({ query, limit }, "Searching products");
    const data = await this.request<{ products: ShopifyProduct[] }>(
      `/products.json?title=${encodeURIComponent(query)}&limit=${limit}`
    );
    return data.products;
  }

  async getProduct(productId: string): Promise<ShopifyProduct | null> {
    try {
      const data = await this.request<{ product: ShopifyProduct }>(`/products/${productId}.json`);
      return data.product;
    } catch {
      return null;
    }
  }

  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    logger.info({ orderId }, "Getting order");
    try {
      const data = await this.request<{ order: ShopifyOrder }>(`/orders/${orderId}.json`);
      return data.order;
    } catch {
      try {
        const data = await this.request<{ orders: ShopifyOrder[] }>(
          `/orders.json?name=${encodeURIComponent(orderId)}&status=any`
        );
        return data.orders[0] || null;
      } catch {
        return null;
      }
    }
  }

  async getOrdersByEmail(email: string, limit = 5): Promise<ShopifyOrder[]> {
    const data = await this.request<{ orders: ShopifyOrder[] }>(
      `/orders.json?email=${encodeURIComponent(email)}&limit=${limit}&status=any`
    );
    return data.orders;
  }

  async getTracking(orderId: string): Promise<{ url?: string; number?: string } | null> {
    try {
      const data = await this.request<{
        fulfillments: Array<{ tracking_url: string; tracking_number: string }>;
      }>(`/orders/${orderId}/fulfillments.json`);

      if (data.fulfillments.length > 0) {
        return {
          url: data.fulfillments[0].tracking_url,
          number: data.fulfillments[0].tracking_number,
        };
      }
    } catch {}
    return null;
  }
}
