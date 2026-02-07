import type { Skill, SkillContext, SkillResult } from '../types/index.js';

// Built-in skills
const builtinSkills: Map<string, Skill> = new Map();

// Order Lookup Skill
builtinSkills.set('order-lookup', {
  name: 'order-lookup',
  description: 'Look up order status and tracking information',
  triggers: ['where is my order', 'order status', 'track order', 'order #'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    // Extract order number from message
    const orderMatch = ctx.message.match(/#?(\d{4,})/);
    if (!orderMatch) {
      return {
        response: 'Please provide your order number (e.g., #1001) and I\'ll look it up for you.',
      };
    }
    
    const orderNumber = orderMatch[1];
    const order = await ctx.store.getOrderByNumber(orderNumber);
    
    if (!order) {
      return {
        response: `I couldn't find order #${orderNumber}. Please double-check the number and try again.`,
      };
    }
    
    let response = `📦 **Order #${order.number}**\n`;
    response += `Status: ${formatStatus(order.status)}\n`;
    response += `Total: ${order.currency} ${order.total.toFixed(2)}\n`;
    response += `Placed: ${order.createdAt.toLocaleDateString()}\n\n`;
    
    response += `**Items:**\n`;
    for (const item of order.items) {
      response += `• ${item.quantity}x ${item.name}\n`;
    }
    
    if (order.trackingNumber) {
      response += `\n🚚 **Tracking:** ${order.trackingNumber}`;
      if (order.trackingUrl) {
        response += `\n[Track Package](${order.trackingUrl})`;
      }
    }
    
    return {
      response,
      context: { orderId: order.id },
    };
  },
});

// Customer Support Skill
builtinSkills.set('customer-support', {
  name: 'customer-support',
  description: 'Handle common customer support questions',
  triggers: ['return', 'refund', 'exchange', 'cancel', 'help'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    const message = ctx.message.toLowerCase();
    
    if (message.includes('return') || message.includes('exchange')) {
      return {
        response: `To initiate a return or exchange:

1. Make sure your order was placed within the last 30 days
2. Items must be unused and in original packaging
3. Reply with your order number and I'll help you get started

Or visit our Returns Center at [store-url]/returns`,
      };
    }
    
    if (message.includes('refund')) {
      return {
        response: `Refunds are processed within 5-7 business days after we receive your return.

The refund will be credited to your original payment method.

Need to check the status of a refund? Reply with your order number.`,
      };
    }
    
    if (message.includes('cancel')) {
      return {
        response: `To cancel an order, please provide your order number.

Note: Orders can only be cancelled before they ship. If your order has already shipped, you can refuse delivery or return it for a refund.`,
      };
    }
    
    return {
      response: `How can I help you today? I can assist with:

• 📦 Order tracking and status
• 🔄 Returns and exchanges
• 💰 Refunds
• ❌ Order cancellation
• 🛍️ Product questions

Just let me know what you need!`,
    };
  },
});

// Inventory Alerts Skill
builtinSkills.set('inventory-alerts', {
  name: 'inventory-alerts',
  description: 'Monitor and alert on low inventory',
  triggers: ['low stock', 'inventory', 'out of stock', 'restock'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    const products = await ctx.store.getLowStockProducts(10);
    
    if (products.length === 0) {
      return {
        response: '✅ All products have healthy inventory levels!',
      };
    }
    
    let response = `⚠️ **Low Stock Alert** (${products.length} products)\n\n`;
    
    for (const product of products.slice(0, 10)) {
      response += `• **${product.name}**: ${product.inventory} left\n`;
    }
    
    if (products.length > 10) {
      response += `\n...and ${products.length - 10} more products`;
    }
    
    return { response };
  },
});

// Sales Insights Skill
builtinSkills.set('sales-insights', {
  name: 'sales-insights',
  description: 'Provide sales and revenue insights',
  triggers: ['sales', 'revenue', 'how are we doing', 'performance', 'metrics'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    const message = ctx.message.toLowerCase();
    
    let period: 'today' | 'week' | 'month' = 'today';
    if (message.includes('week')) period = 'week';
    if (message.includes('month')) period = 'month';
    
    const metrics = await ctx.store.getMetrics(period);
    
    const periodLabel = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
    }[period];
    
    let response = `📊 **${periodLabel}'s Performance**\n\n`;
    response += `• Orders: ${metrics.orders}\n`;
    response += `• Revenue: $${metrics.revenue.toFixed(2)}\n`;
    response += `• Avg Order: $${metrics.averageOrderValue.toFixed(2)}\n`;
    
    if (metrics.topProducts.length > 0) {
      response += `\n🏆 **Top Products:**\n`;
      for (const { product, quantity } of metrics.topProducts.slice(0, 3)) {
        response += `• ${product.name}: ${quantity} sold\n`;
      }
    }
    
    if (metrics.lowStockCount > 0) {
      response += `\n⚠️ ${metrics.lowStockCount} products are low on stock`;
    }
    
    return { response };
  },
});

// Product Search Skill
builtinSkills.set('product-search', {
  name: 'product-search',
  description: 'Search and recommend products',
  triggers: ['find', 'search', 'looking for', 'recommend', 'suggest'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    // Extract search query
    const query = ctx.message
      .replace(/^(find|search|looking for|recommend|suggest)\s*/i, '')
      .trim();
    
    if (!query) {
      return {
        response: 'What kind of product are you looking for?',
      };
    }
    
    const products = await ctx.store.searchProducts(query);
    
    if (products.length === 0) {
      return {
        response: `I couldn't find any products matching "${query}". Try a different search term?`,
      };
    }
    
    let response = `Found ${products.length} product${products.length === 1 ? '' : 's'}:\n\n`;
    
    for (const product of products.slice(0, 5)) {
      response += `**${product.name}**\n`;
      response += `$${product.price.toFixed(2)}`;
      if (product.compareAtPrice) {
        response += ` ~~$${product.compareAtPrice.toFixed(2)}~~`;
      }
      response += product.inventory > 0 ? ' • In Stock' : ' • Out of Stock';
      response += '\n\n';
    }
    
    return { response };
  },
});

function formatStatus(status: string): string {
  const statusEmoji: Record<string, string> = {
    pending: '⏳ Pending',
    confirmed: '✓ Confirmed',
    processing: '📋 Processing',
    shipped: '🚚 Shipped',
    delivered: '✅ Delivered',
    cancelled: '❌ Cancelled',
    refunded: '💰 Refunded',
  };
  return statusEmoji[status] || status;
}

export function loadSkills(names: string[]): Skill[] {
  const skills: Skill[] = [];
  
  for (const name of names) {
    const skill = builtinSkills.get(name);
    if (skill) {
      skills.push(skill);
    } else {
      console.warn(`Skill not found: ${name}`);
    }
  }
  
  return skills;
}

export function getAvailableSkills(): string[] {
  return Array.from(builtinSkills.keys());
}
