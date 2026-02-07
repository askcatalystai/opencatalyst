import { BaseStoreClient } from './base.js';
import type { 
  Store, 
  Order, 
  Product, 
  Customer, 
  StoreMetrics,
  OrderStatus 
} from '../types/index.js';

interface MedusaOrder {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status: string;
  payment_status: string;
  email: string;
  customer_id: string;
  items: MedusaLineItem[];
  total: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
  shipping_address: MedusaAddress | null;
  fulfillments: MedusaFulfillment[];
}

interface MedusaLineItem {
  id: string;
  variant_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  variant: {
    product_id: string;
  };
}

interface MedusaAddress {
  address_1: string;
  address_2: string | null;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
}

interface MedusaFulfillment {
  tracking_numbers: string[];
  tracking_links: { url: string }[];
}

interface MedusaProduct {
  id: string;
  title: string;
  description: string;
  variants: MedusaVariant[];
  images: { url: string }[];
  tags: { value: string }[];
  collection?: { title: string };
}

interface MedusaVariant {
  id: string;
  title: string;
  prices: { amount: number; currency_code: string }[];
  inventory_quantity: number;
  sku: string | null;
}

interface MedusaCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders: MedusaOrder[];
}

export class MedusaStoreClient extends BaseStoreClient {
  platform = 'medusa' as const;
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(config: Store) {
    super(config);
    this.baseUrl = config.url.replace(/\/$/, '');
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'x-medusa-access-token': config.apiKey }),
      ...(config.accessToken && { 'Authorization': `Bearer ${config.accessToken}` }),
    };
  }
  
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...options?.headers },
    });
    
    if (!response.ok) {
      throw new Error(`Medusa API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  private mapOrderStatus(medusaOrder: MedusaOrder): OrderStatus {
    if (medusaOrder.status === 'canceled') return 'cancelled';
    if (medusaOrder.fulfillment_status === 'shipped') return 'shipped';
    if (medusaOrder.fulfillment_status === 'fulfilled') return 'delivered';
    if (medusaOrder.payment_status === 'refunded') return 'refunded';
    if (medusaOrder.payment_status === 'captured') return 'processing';
    if (medusaOrder.payment_status === 'awaiting') return 'pending';
    return 'confirmed';
  }
  
  private mapOrder(mo: MedusaOrder): Order {
    const fulfillment = mo.fulfillments?.[0];
    
    return {
      id: mo.id,
      number: mo.display_id.toString(),
      status: this.mapOrderStatus(mo),
      customer: {
        id: mo.customer_id,
        email: mo.email,
        name: mo.email.split('@')[0], // Will be enriched later
        totalOrders: 0,
        totalSpent: 0,
      },
      items: mo.items.map(item => ({
        id: item.id,
        productId: item.variant?.product_id || '',
        variantId: item.variant_id,
        name: item.title,
        quantity: item.quantity,
        price: item.unit_price / 100, // Medusa stores in cents
      })),
      total: mo.total / 100,
      currency: mo.currency_code.toUpperCase(),
      createdAt: new Date(mo.created_at),
      updatedAt: new Date(mo.updated_at),
      shippingAddress: mo.shipping_address ? {
        line1: mo.shipping_address.address_1,
        line2: mo.shipping_address.address_2 || undefined,
        city: mo.shipping_address.city,
        state: mo.shipping_address.province,
        postalCode: mo.shipping_address.postal_code,
        country: mo.shipping_address.country_code,
      } : undefined,
      trackingNumber: fulfillment?.tracking_numbers?.[0],
      trackingUrl: fulfillment?.tracking_links?.[0]?.url,
    };
  }
  
  private mapProduct(mp: MedusaProduct): Product {
    const defaultVariant = mp.variants[0];
    const defaultPrice = defaultVariant?.prices?.find(p => p.currency_code === 'usd') 
      || defaultVariant?.prices?.[0];
    
    return {
      id: mp.id,
      name: mp.title,
      description: mp.description || '',
      price: (defaultPrice?.amount || 0) / 100,
      inventory: mp.variants.reduce((sum, v) => sum + v.inventory_quantity, 0),
      images: mp.images.map(i => i.url),
      variants: mp.variants.map(v => ({
        id: v.id,
        name: v.title,
        price: (v.prices?.find(p => p.currency_code === 'usd')?.amount || 0) / 100,
        inventory: v.inventory_quantity,
        sku: v.sku || undefined,
      })),
      tags: mp.tags?.map(t => t.value) || [],
      category: mp.collection?.title,
    };
  }
  
  async getOrder(id: string): Promise<Order | null> {
    return this.handleError('get order', async () => {
      const { order } = await this.fetch<{ order: MedusaOrder }>(`/admin/orders/${id}`);
      return this.mapOrder(order);
    });
  }
  
  async getOrderByNumber(number: string): Promise<Order | null> {
    return this.handleError('get order by number', async () => {
      const { orders } = await this.fetch<{ orders: MedusaOrder[] }>(
        `/admin/orders?display_id=${number}`
      );
      return orders[0] ? this.mapOrder(orders[0]) : null;
    });
  }
  
  async getRecentOrders(limit = 10): Promise<Order[]> {
    return this.handleError('get recent orders', async () => {
      const { orders } = await this.fetch<{ orders: MedusaOrder[] }>(
        `/admin/orders?limit=${limit}&order=-created_at`
      );
      return orders.map(o => this.mapOrder(o));
    });
  }
  
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.handleError('get customer orders', async () => {
      const { orders } = await this.fetch<{ orders: MedusaOrder[] }>(
        `/admin/orders?customer_id=${customerId}`
      );
      return orders.map(o => this.mapOrder(o));
    });
  }
  
  async getProduct(id: string): Promise<Product | null> {
    return this.handleError('get product', async () => {
      const { product } = await this.fetch<{ product: MedusaProduct }>(`/admin/products/${id}`);
      return this.mapProduct(product);
    });
  }
  
  async searchProducts(query: string): Promise<Product[]> {
    return this.handleError('search products', async () => {
      const { products } = await this.fetch<{ products: MedusaProduct[] }>(
        `/admin/products?q=${encodeURIComponent(query)}`
      );
      return products.map(p => this.mapProduct(p));
    });
  }
  
  async getLowStockProducts(threshold = 10): Promise<Product[]> {
    return this.handleError('get low stock products', async () => {
      const { products } = await this.fetch<{ products: MedusaProduct[] }>(
        `/admin/products?limit=100`
      );
      
      return products
        .map(p => this.mapProduct(p))
        .filter(p => p.inventory <= threshold);
    });
  }
  
  async getCustomer(id: string): Promise<Customer | null> {
    return this.handleError('get customer', async () => {
      const { customer } = await this.fetch<{ customer: MedusaCustomer }>(`/admin/customers/${id}`);
      return {
        id: customer.id,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        totalOrders: customer.orders?.length || 0,
        totalSpent: customer.orders?.reduce((sum, o) => sum + o.total, 0) / 100 || 0,
      };
    });
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return this.handleError('get customer by email', async () => {
      const { customers } = await this.fetch<{ customers: MedusaCustomer[] }>(
        `/admin/customers?q=${encodeURIComponent(email)}`
      );
      const customer = customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (!customer) return null;
      
      return {
        id: customer.id,
        email: customer.email,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
        phone: customer.phone || undefined,
        totalOrders: customer.orders?.length || 0,
        totalSpent: customer.orders?.reduce((sum, o) => sum + o.total, 0) / 100 || 0,
      };
    });
  }
  
  async getMetrics(period: 'today' | 'week' | 'month'): Promise<StoreMetrics> {
    return this.handleError('get metrics', async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      
      const { orders } = await this.fetch<{ orders: MedusaOrder[] }>(
        `/admin/orders?created_at[gte]=${startDate.toISOString()}`
      );
      
      const revenue = orders.reduce((sum, o) => sum + o.total, 0) / 100;
      const averageOrderValue = orders.length > 0 ? revenue / orders.length : 0;
      
      // Get top products
      const productCounts = new Map<string, { name: string; count: number }>();
      for (const order of orders) {
        for (const item of order.items) {
          const current = productCounts.get(item.variant?.product_id || item.id) || { 
            name: item.title, 
            count: 0 
          };
          current.count += item.quantity;
          productCounts.set(item.variant?.product_id || item.id, current);
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
