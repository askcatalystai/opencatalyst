import { BaseStoreClient } from './base.js';
import type { 
  Store, 
  Order, 
  Product, 
  Customer, 
  StoreMetrics,
  OrderStatus 
} from '../types/index.js';

interface ShopifyOrder {
  id: number;
  name: string; // e.g., "#1001"
  order_number: number;
  financial_status: string;
  fulfillment_status: string | null;
  email: string;
  customer: ShopifyCustomer;
  line_items: ShopifyLineItem[];
  total_price: string;
  currency: string;
  created_at: string;
  updated_at: string;
  shipping_address: ShopifyAddress | null;
  fulfillments: ShopifyFulfillment[];
  cancelled_at: string | null;
  refunds: ShopifyRefund[];
}

interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  quantity: number;
  price: string;
}

interface ShopifyAddress {
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  zip: string;
  country_code: string;
}

interface ShopifyFulfillment {
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
}

interface ShopifyRefund {
  id: number;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  variants: ShopifyVariant[];
  images: { src: string }[];
  tags: string;
  product_type: string;
}

interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  sku: string | null;
}

interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: string;
}

export class ShopifyStoreClient extends BaseStoreClient {
  platform = 'shopify' as const;
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(config: Store) {
    super(config);
    // Shopify URLs: https://store.myshopify.com or custom domain
    this.baseUrl = `${config.url.replace(/\/$/, '')}/admin/api/2024-01`;
    this.headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken || config.apiKey || '',
    };
  }
  
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  private mapOrderStatus(order: ShopifyOrder): OrderStatus {
    if (order.cancelled_at) return 'cancelled';
    if (order.refunds?.length > 0) return 'refunded';
    if (order.fulfillment_status === 'fulfilled') return 'delivered';
    if (order.fulfillment_status === 'partial' || order.fulfillments?.some(f => f.status === 'success')) {
      return 'shipped';
    }
    if (order.financial_status === 'paid') return 'processing';
    if (order.financial_status === 'pending') return 'pending';
    return 'confirmed';
  }
  
  private mapOrder(so: ShopifyOrder): Order {
    const latestFulfillment = so.fulfillments?.[so.fulfillments.length - 1];
    
    return {
      id: so.id.toString(),
      number: so.order_number.toString(),
      status: this.mapOrderStatus(so),
      customer: {
        id: so.customer?.id?.toString() || '',
        email: so.email,
        name: so.customer 
          ? `${so.customer.first_name || ''} ${so.customer.last_name || ''}`.trim()
          : so.email,
        totalOrders: so.customer?.orders_count || 0,
        totalSpent: parseFloat(so.customer?.total_spent || '0'),
      },
      items: so.line_items.map(item => ({
        id: item.id.toString(),
        productId: item.product_id.toString(),
        variantId: item.variant_id?.toString(),
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
      })),
      total: parseFloat(so.total_price),
      currency: so.currency,
      createdAt: new Date(so.created_at),
      updatedAt: new Date(so.updated_at),
      shippingAddress: so.shipping_address ? {
        line1: so.shipping_address.address1,
        line2: so.shipping_address.address2 || undefined,
        city: so.shipping_address.city,
        state: so.shipping_address.province,
        postalCode: so.shipping_address.zip,
        country: so.shipping_address.country_code,
      } : undefined,
      trackingNumber: latestFulfillment?.tracking_number || undefined,
      trackingUrl: latestFulfillment?.tracking_url || undefined,
    };
  }
  
  private mapProduct(sp: ShopifyProduct): Product {
    const defaultVariant = sp.variants[0];
    
    return {
      id: sp.id.toString(),
      name: sp.title,
      description: sp.body_html?.replace(/<[^>]*>/g, '') || '',
      price: parseFloat(defaultVariant?.price || '0'),
      compareAtPrice: defaultVariant?.compare_at_price 
        ? parseFloat(defaultVariant.compare_at_price) 
        : undefined,
      inventory: sp.variants.reduce((sum, v) => sum + v.inventory_quantity, 0),
      images: sp.images.map(i => i.src),
      variants: sp.variants.map(v => ({
        id: v.id.toString(),
        name: v.title,
        price: parseFloat(v.price),
        inventory: v.inventory_quantity,
        sku: v.sku || undefined,
      })),
      tags: sp.tags ? sp.tags.split(',').map(t => t.trim()) : [],
      category: sp.product_type || undefined,
    };
  }
  
  async getOrder(id: string): Promise<Order | null> {
    return this.handleError('get order', async () => {
      const { order } = await this.fetch<{ order: ShopifyOrder }>(`/orders/${id}.json`);
      return this.mapOrder(order);
    });
  }
  
  async getOrderByNumber(number: string): Promise<Order | null> {
    return this.handleError('get order by number', async () => {
      const { orders } = await this.fetch<{ orders: ShopifyOrder[] }>(
        `/orders.json?name=%23${number}`
      );
      return orders[0] ? this.mapOrder(orders[0]) : null;
    });
  }
  
  async getRecentOrders(limit = 10): Promise<Order[]> {
    return this.handleError('get recent orders', async () => {
      const { orders } = await this.fetch<{ orders: ShopifyOrder[] }>(
        `/orders.json?limit=${limit}&status=any`
      );
      return orders.map(o => this.mapOrder(o));
    });
  }
  
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.handleError('get customer orders', async () => {
      const { orders } = await this.fetch<{ orders: ShopifyOrder[] }>(
        `/orders.json?customer_id=${customerId}&status=any`
      );
      return orders.map(o => this.mapOrder(o));
    });
  }
  
  async getProduct(id: string): Promise<Product | null> {
    return this.handleError('get product', async () => {
      const { product } = await this.fetch<{ product: ShopifyProduct }>(`/products/${id}.json`);
      return this.mapProduct(product);
    });
  }
  
  async searchProducts(query: string): Promise<Product[]> {
    return this.handleError('search products', async () => {
      const { products } = await this.fetch<{ products: ShopifyProduct[] }>(
        `/products.json?title=${encodeURIComponent(query)}`
      );
      return products.map(p => this.mapProduct(p));
    });
  }
  
  async getLowStockProducts(threshold = 10): Promise<Product[]> {
    return this.handleError('get low stock products', async () => {
      const { products } = await this.fetch<{ products: ShopifyProduct[] }>(
        `/products.json?limit=250`
      );
      
      return products
        .map(p => this.mapProduct(p))
        .filter(p => p.inventory <= threshold);
    });
  }
  
  async getCustomer(id: string): Promise<Customer | null> {
    return this.handleError('get customer', async () => {
      const { customer } = await this.fetch<{ customer: ShopifyCustomer }>(`/customers/${id}.json`);
      return {
        id: customer.id.toString(),
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        totalOrders: customer.orders_count,
        totalSpent: parseFloat(customer.total_spent),
      };
    });
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return this.handleError('get customer by email', async () => {
      const { customers } = await this.fetch<{ customers: ShopifyCustomer[] }>(
        `/customers/search.json?query=email:${encodeURIComponent(email)}`
      );
      const customer = customers[0];
      if (!customer) return null;
      
      return {
        id: customer.id.toString(),
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        totalOrders: customer.orders_count,
        totalSpent: parseFloat(customer.total_spent),
      };
    });
  }
  
  async getMetrics(period: 'today' | 'week' | 'month'): Promise<StoreMetrics> {
    return this.handleError('get metrics', async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      
      const { orders } = await this.fetch<{ orders: ShopifyOrder[] }>(
        `/orders.json?created_at_min=${startDate.toISOString()}&status=any`
      );
      
      const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
      const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0;
      
      // Get top products
      const productCounts = new Map<string, { name: string; count: number }>();
      for (const order of orders) {
        for (const item of order.line_items) {
          const id = item.product_id.toString();
          const current = productCounts.get(id) || { name: item.title, count: 0 };
          current.count += item.quantity;
          productCounts.set(id, current);
        }
      }
      
      const topProducts = Array.from(productCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([id, { name, count }]) => ({
          product: { 
            id, 
            name, 
            description: '', 
            price: 0, 
            inventory: 0, 
            images: [], 
            variants: [], 
            tags: [] 
          },
          quantity: count,
        }));
      
      const lowStock = await this.getLowStockProducts(10);
      
      return {
        orders: orders.length,
        revenue,
        averageOrderValue,
        topProducts,
        lowStockCount: lowStock.length,
      };
    });
  }
}
