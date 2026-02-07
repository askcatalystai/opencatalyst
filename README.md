# 🚀 OpenCatalyst

**AI assistant for ecommerce brands — simple, focused, powerful.**

OpenCatalyst is a simplified AI agent platform built specifically for Shopify, Medusa, and WooCommerce stores. Think OpenClaw, but purpose-built for ecommerce operations.

## Why OpenCatalyst?

| Problem | Solution |
|---------|----------|
| Customer support is overwhelming | AI handles common questions 24/7 |
| Order tracking is manual | Automated updates + proactive alerts |
| Inventory management is reactive | AI monitors stock, predicts needs |
| Multiple tools, no integration | One AI that connects everything |

## Quick Start

```bash
npm install -g opencatalyst
opencatalyst init
opencatalyst start
```

## Core Concepts

### 🏪 Stores
Connect your ecommerce platform once. OpenCatalyst handles the rest.

```yaml
stores:
  - name: "Lohitha Foods"
    platform: medusa
    url: https://api.lohithafoods.com
    apiKey: ${MEDUSA_API_KEY}
```

Supported platforms:
- **Shopify** (Admin API + Storefront API)
- **Medusa.js** (Full API access)
- **WooCommerce** (REST API)

### 📱 Channels
Where your AI assistant lives.

```yaml
channels:
  slack:
    botToken: ${SLACK_BOT_TOKEN}
    channels: ["#orders", "#support"]
  
  webchat:
    enabled: true
    # Embed on your store
  
  whatsapp:
    # For customer support
  
  email:
    # Order confirmations, support tickets
```

### 🛠️ Skills
Pre-built capabilities for ecommerce:

| Skill | What it does |
|-------|--------------|
| `order-lookup` | "Where's my order?" → instant tracking |
| `inventory-alerts` | Low stock notifications |
| `customer-support` | Handle common questions |
| `sales-insights` | Daily/weekly sales summaries |
| `product-search` | Find products by description |
| `abandoned-cart` | Recovery workflows |
| `returns-handler` | Process return requests |

### 🔄 Workflows
Automate common operations:

```yaml
workflows:
  low-stock-alert:
    trigger: inventory.below_threshold
    threshold: 10
    actions:
      - notify: "#inventory"
      - message: "⚠️ {{product.name}} is low ({{quantity}} left)"
  
  order-shipped:
    trigger: order.shipped
    actions:
      - email: customer
      - whatsapp: customer
      - message: "Your order is on the way! 🚚"
```

## Architecture

```
Customer (WhatsApp/Web/Email)
         │
         ▼
┌─────────────────────────────┐
│     OpenCatalyst Gateway    │
│    (your server/Vercel)     │
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Shopify │ │ Medusa │ │  WC    │
│ Store  │ │  API   │ │  API   │
└────────┘ └────────┘ └────────┘
```

## Configuration

```yaml
# opencatalyst.yaml

name: "Lohitha Foods Store Assistant"
model: claude-sonnet-4  # or gpt-4o, gemini-pro

stores:
  - name: lohitha
    platform: medusa
    url: https://api.lohithafoods.com

channels:
  slack:
    enabled: true
    botToken: ${SLACK_BOT_TOKEN}
  webchat:
    enabled: true
    theme: "rice-gold"  # Match your brand

skills:
  - order-lookup
  - inventory-alerts
  - customer-support
  - sales-insights

workflows:
  - low-stock-alert
  - daily-summary
```

## Deployment Options

### 1. Local (Development)
```bash
opencatalyst start --watch
```

### 2. Vercel (Recommended for production)
```bash
vercel deploy
```

### 3. Docker
```bash
docker run -d opencatalyst/opencatalyst
```

### 4. Self-hosted
```bash
pm2 start opencatalyst
```

## API

OpenCatalyst exposes a simple API for custom integrations:

```typescript
// Ask the assistant anything
POST /api/ask
{
  "message": "How many orders did we get today?",
  "channel": "api"
}

// Trigger a workflow
POST /api/workflows/run
{
  "workflow": "daily-summary",
  "params": { "channel": "#sales" }
}

// Get store metrics
GET /api/metrics
{
  "today": { "orders": 45, "revenue": 12500 },
  "week": { "orders": 287, "revenue": 78000 }
}
```

## Skills Development

Create custom skills for your store:

```typescript
// skills/rice-recommendations/index.ts
import { defineSkill } from 'opencatalyst';

export default defineSkill({
  name: 'rice-recommendations',
  description: 'Recommend rice varieties based on cuisine',
  
  async run({ query, store }) {
    const products = await store.products.search(query);
    return formatRecommendations(products);
  }
});
```

## Roadmap

- [x] Core Gateway
- [x] Shopify integration
- [x] Medusa integration
- [ ] WooCommerce integration
- [x] Slack channel
- [ ] WhatsApp Business
- [x] WebChat widget
- [ ] Email integration
- [ ] Inventory alerts
- [ ] Sales dashboards
- [ ] Multi-store support
- [ ] Voice assistant

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT © [Catalyst AI](https://askcatalyst.ai)

---

Built with ❤️ by **Catalyst AI** — Making ecommerce smarter, one store at a time.
