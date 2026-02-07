// Core types for OpenCatalyst

export interface Store {
  name: string;
  platform: 'shopify' | 'medusa' | 'woocommerce';
  url: string;
  apiKey?: string;
  accessToken?: string;
}

export interface Channel {
  type: 'slack' | 'webchat' | 'whatsapp' | 'email';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Config {
  name: string;
  model: string;
  stores: Store[];
  channels: Channel[];
  skills: string[];
  workflows: Workflow[];
}

export interface Workflow {
  name: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook';
  event?: string;
  schedule?: string;
  threshold?: number;
}

export interface WorkflowAction {
  type: 'notify' | 'email' | 'whatsapp' | 'webhook' | 'custom';
  target?: string;
  template?: string;
  data?: Record<string, unknown>;
}

// Store API types
export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  customer: Customer;
  items: OrderItem[];
  total: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress?: Address;
  trackingNumber?: string;
  trackingUrl?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  images: string[];
  variants: ProductVariant[];
  tags: string[];
  category?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  inventory: number;
  sku?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Agent types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel?: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  channel: string;
  customerId?: string;
  messages: Message[];
  context: SessionContext;
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionContext {
  store: string;
  orderId?: string;
  productId?: string;
  intent?: string;
  metadata?: Record<string, unknown>;
}

// Skill types
export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  run: (ctx: SkillContext) => Promise<SkillResult>;
}

export interface SkillContext {
  message: string;
  session: Session;
  store: StoreClient;
  params?: Record<string, unknown>;
}

export interface SkillResult {
  response: string;
  actions?: WorkflowAction[];
  context?: Partial<SessionContext>;
}

// Store client interface (implemented per platform)
export interface StoreClient {
  platform: Store['platform'];
  
  // Orders
  getOrder(id: string): Promise<Order | null>;
  getOrderByNumber(number: string): Promise<Order | null>;
  getRecentOrders(limit?: number): Promise<Order[]>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  
  // Products
  getProduct(id: string): Promise<Product | null>;
  searchProducts(query: string): Promise<Product[]>;
  getLowStockProducts(threshold?: number): Promise<Product[]>;
  
  // Customers
  getCustomer(id: string): Promise<Customer | null>;
  getCustomerByEmail(email: string): Promise<Customer | null>;
  
  // Metrics
  getMetrics(period: 'today' | 'week' | 'month'): Promise<StoreMetrics>;
}

export interface StoreMetrics {
  orders: number;
  revenue: number;
  averageOrderValue: number;
  topProducts: { product: Product; quantity: number }[];
  lowStockCount: number;
}

// Events
export type StoreEvent = 
  | { type: 'order.created'; order: Order }
  | { type: 'order.updated'; order: Order }
  | { type: 'order.shipped'; order: Order; trackingNumber: string }
  | { type: 'inventory.low'; product: Product; quantity: number }
  | { type: 'customer.created'; customer: Customer };
