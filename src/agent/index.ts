import Anthropic from '@anthropic-ai/sdk';
import type { 
  Config, 
  Session, 
  Message, 
  StoreClient,
  Skill,
} from '../types/index.js';
import { createStoreClient } from '../stores/index.js';
import { loadSkills } from '../skills/index.js';
import { Workspace } from '../core/workspace.js';
import { SessionManager } from '../core/sessions.js';

/**
 * OpenCatalyst Agent
 * 
 * AI assistant with:
 * - Memory (long-term knowledge + daily notes)
 * - Soul (personality and brand voice)
 * - Workspace (sessions, custom skills)
 * - Ecommerce tools (orders, products, customers)
 */
export class Agent {
  private anthropic: Anthropic;
  private config: Config;
  private stores: Map<string, StoreClient> = new Map();
  private skills: Map<string, Skill> = new Map();
  private workspace: Workspace;
  private sessionManager: SessionManager;
  
  constructor(config: Config, workspacePath: string) {
    this.config = config;
    this.anthropic = new Anthropic();
    this.workspace = new Workspace({ path: workspacePath });
    this.sessionManager = new SessionManager(this.workspace);
    
    // Initialize store clients
    for (const store of config.stores) {
      this.stores.set(store.name, createStoreClient(store));
    }
    
    // Load skills
    const skills = loadSkills(config.skills);
    for (const skill of skills) {
      this.skills.set(skill.name, skill);
    }
  }
  
  async init(): Promise<void> {
    await this.workspace.init();
    await this.workspace.soul.load();
    console.log(`✨ Soul loaded: ${this.workspace.soul.getConfig().name}`);
  }
  
  getWorkspace(): Workspace {
    return this.workspace;
  }
  
  private buildTools(): Anthropic.Tool[] {
    return [
      {
        name: 'lookup_order',
        description: 'Look up an order by order number or order ID',
        input_schema: {
          type: 'object',
          properties: {
            order_number: {
              type: 'string',
              description: 'The order number (e.g., "1001" or "#1001")',
            },
            order_id: {
              type: 'string',
              description: 'The internal order ID',
            },
          },
          required: [],
        },
      },
      {
        name: 'search_products',
        description: 'Search for products by name or description',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for products',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_store_metrics',
        description: 'Get store performance metrics (orders, revenue, etc.)',
        input_schema: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              enum: ['today', 'week', 'month'],
              description: 'Time period for metrics',
            },
          },
          required: ['period'],
        },
      },
      {
        name: 'get_low_stock',
        description: 'Get products with low inventory',
        input_schema: {
          type: 'object',
          properties: {
            threshold: {
              type: 'number',
              description: 'Stock threshold (default: 10)',
            },
          },
          required: [],
        },
      },
      {
        name: 'lookup_customer',
        description: 'Look up a customer by email',
        input_schema: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              description: 'Customer email address',
            },
          },
          required: ['email'],
        },
      },
      {
        name: 'remember',
        description: 'Save important information to memory for future reference',
        input_schema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Information to remember',
            },
            category: {
              type: 'string',
              description: 'Category (e.g., "Customer Insights", "Products", "Issues")',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'search_memory',
        description: 'Search stored knowledge and memory',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
    ];
  }
  
  private async handleToolCall(
    name: string, 
    input: Record<string, unknown>,
    session: Session
  ): Promise<string> {
    const store = this.stores.get(session.context.store);
    
    try {
      switch (name) {
        case 'lookup_order': {
          if (!store) return 'Error: No store configured';
          
          const orderNumber = input.order_number as string | undefined;
          const orderId = input.order_id as string | undefined;
          
          let order = null;
          if (orderNumber) {
            const cleanNumber = orderNumber.replace(/^#/, '');
            order = await store.getOrderByNumber(cleanNumber);
          } else if (orderId) {
            order = await store.getOrder(orderId);
          }
          
          if (!order) {
            return 'Order not found. Please check the order number and try again.';
          }
          
          return JSON.stringify({
            orderNumber: `#${order.number}`,
            status: order.status,
            total: `${order.currency} ${order.total.toFixed(2)}`,
            items: order.items.map(i => `${i.quantity}x ${i.name}`),
            createdAt: order.createdAt.toISOString(),
            tracking: order.trackingNumber ? {
              number: order.trackingNumber,
              url: order.trackingUrl,
            } : null,
          }, null, 2);
        }
        
        case 'search_products': {
          if (!store) return 'Error: No store configured';
          
          const query = input.query as string;
          const products = await store.searchProducts(query);
          
          if (products.length === 0) {
            return 'No products found matching your search.';
          }
          
          return JSON.stringify(products.slice(0, 5).map(p => ({
            name: p.name,
            price: p.price,
            inStock: p.inventory > 0,
            inventory: p.inventory,
          })), null, 2);
        }
        
        case 'get_store_metrics': {
          if (!store) return 'Error: No store configured';
          
          const period = input.period as 'today' | 'week' | 'month';
          const metrics = await store.getMetrics(period);
          
          return JSON.stringify({
            period,
            orders: metrics.orders,
            revenue: `$${metrics.revenue.toFixed(2)}`,
            averageOrderValue: `$${metrics.averageOrderValue.toFixed(2)}`,
            topProducts: metrics.topProducts.slice(0, 3).map(p => ({
              name: p.product.name,
              sold: p.quantity,
            })),
            lowStockAlerts: metrics.lowStockCount,
          }, null, 2);
        }
        
        case 'get_low_stock': {
          if (!store) return 'Error: No store configured';
          
          const threshold = (input.threshold as number) || 10;
          const products = await store.getLowStockProducts(threshold);
          
          if (products.length === 0) {
            return 'All products have sufficient stock!';
          }
          
          return JSON.stringify(products.slice(0, 10).map(p => ({
            name: p.name,
            inventory: p.inventory,
          })), null, 2);
        }
        
        case 'lookup_customer': {
          if (!store) return 'Error: No store configured';
          
          const email = input.email as string;
          const customer = await store.getCustomerByEmail(email);
          
          if (!customer) {
            return 'Customer not found.';
          }
          
          return JSON.stringify({
            name: customer.name,
            email: customer.email,
            totalOrders: customer.totalOrders,
            totalSpent: `$${customer.totalSpent.toFixed(2)}`,
          }, null, 2);
        }
        
        case 'remember': {
          const content = input.content as string;
          const category = input.category as string | undefined;
          
          await this.workspace.memory.appendToMemory(content, category);
          await this.workspace.memory.appendToDailyNote(content);
          
          return `Saved to memory: "${content}"`;
        }
        
        case 'search_memory': {
          const query = input.query as string;
          const results = await this.workspace.memory.search(query);
          
          if (results.length === 0) {
            return 'No matching memories found.';
          }
          
          return `Found ${results.length} matches:\n${results.join('\n')}`;
        }
        
        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error) {
      console.error(`Tool error (${name}):`, error);
      return `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  async chat(
    message: string, 
    sessionId: string, 
    channel: string
  ): Promise<string> {
    const session = await this.sessionManager.getOrCreate(sessionId, channel);
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      channel,
      timestamp: new Date(),
    };
    session.messages.push(userMessage);
    session.lastActivity = new Date();
    
    // Build context from workspace (soul + memory)
    const workspaceContext = await this.workspace.getContext();
    
    // Build store context
    const storeInfo = this.config.stores.length > 0 
      ? `Connected store: ${this.config.stores[0].name} (${this.config.stores[0].platform})`
      : 'No store connected';
    
    const systemPrompt = `${workspaceContext}\n\n## Store\n${storeInfo}`;
    
    // Convert session messages to Anthropic format
    const messages: Anthropic.MessageParam[] = session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    
    try {
      let response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 1024,
        system: systemPrompt,
        tools: this.buildTools(),
        messages,
      });
      
      // Handle tool use
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );
        
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUseBlocks) {
          const result = await this.handleToolCall(
            toolUse.name, 
            toolUse.input as Record<string, unknown>,
            session
          );
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          });
        }
        
        messages.push({
          role: 'assistant',
          content: response.content,
        });
        messages.push({
          role: 'user',
          content: toolResults,
        });
        
        response = await this.anthropic.messages.create({
          model: this.config.model,
          max_tokens: 1024,
          system: systemPrompt,
          tools: this.buildTools(),
          messages,
        });
      }
      
      // Extract text response
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );
      
      const assistantMessage = textBlock?.text || 'I apologize, but I was unable to generate a response.';
      
      // Add assistant message to session
      session.messages.push({
        role: 'assistant',
        content: assistantMessage,
        channel,
        timestamp: new Date(),
      });
      
      // Save session
      await this.sessionManager.save(session);
      
      // Log to daily note
      await this.workspace.memory.appendToDailyNote(
        `**${channel}** [${sessionId.slice(0, 8)}]: ${message.slice(0, 100)}...`
      );
      
      return assistantMessage;
      
    } catch (error) {
      console.error('Agent error:', error);
      throw error;
    }
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessionManager.get(sessionId);
  }
  
  async listSessions(): Promise<Session[]> {
    return this.sessionManager.list();
  }
  
  async clearSession(sessionId: string): Promise<void> {
    await this.sessionManager.delete(sessionId);
  }
}
