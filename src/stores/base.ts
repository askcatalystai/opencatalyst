import type { 
  Store, 
  StoreClient, 
  Order, 
  Product, 
  Customer, 
  StoreMetrics 
} from '../types/index.js';

export abstract class BaseStoreClient implements StoreClient {
  protected config: Store;
  abstract platform: Store['platform'];
  
  constructor(config: Store) {
    this.config = config;
  }
  
  // Orders
  abstract getOrder(id: string): Promise<Order | null>;
  abstract getOrderByNumber(number: string): Promise<Order | null>;
  abstract getRecentOrders(limit?: number): Promise<Order[]>;
  abstract getOrdersByCustomer(customerId: string): Promise<Order[]>;
  
  // Products
  abstract getProduct(id: string): Promise<Product | null>;
  abstract searchProducts(query: string): Promise<Product[]>;
  abstract getLowStockProducts(threshold?: number): Promise<Product[]>;
  
  // Customers
  abstract getCustomer(id: string): Promise<Customer | null>;
  abstract getCustomerByEmail(email: string): Promise<Customer | null>;
  
  // Metrics
  abstract getMetrics(period: 'today' | 'week' | 'month'): Promise<StoreMetrics>;
  
  // Helpers
  protected formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }
  
  protected async handleError<T>(
    operation: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error(`Store error in ${operation}:`, error);
      throw new Error(`Failed to ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
