# OpenCatalyst 🚀

AI-powered ecommerce assistant for WhatsApp, Email, and Chat. Built for Shopify, WooCommerce, and Medusa stores.

> The simpler, ecommerce-focused alternative to OpenClaw.

## Features

- 🤖 **AI-Powered Support** - Claude or GPT handles customer inquiries
- 📱 **WhatsApp Integration** - Connect with customers on WhatsApp Business
- 📧 **Email Support** - Automated email responses
- 💬 **Web Chat Widget** - Embed on your store
- 🛒 **Order Tracking** - Real-time order status and tracking
- 🔍 **Product Search** - Help customers find what they need
- 💡 **Smart Recommendations** - Personalized product suggestions

## Supported Platforms

- **Shopify** - Full integration with Admin API
- **WooCommerce** - REST API integration
- **Medusa** - Native support for Medusa v2

## Quick Start

```bash
# Install globally
npm install -g opencatalyst

# Initialize a new project
opencatalyst init --name "My Store" --platform shopify

# Configure your API keys in .env
cp .env.example .env

# Start the gateway
opencatalyst start
```

## Configuration

Create a `catalyst.config.json` file:

```json
{
  "store": {
    "name": "My Awesome Store",
    "platform": "shopify",
    "url": "https://my-store.myshopify.com"
  },
  "ai": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "apiKey": "your-api-key"
  },
  "channels": {
    "whatsapp": {
      "enabled": true,
      "phoneNumber": "+1234567890"
    },
    "webchat": {
      "enabled": true
    }
  },
  "agent": {
    "name": "Catalyst",
    "greeting": "Hi! How can I help you today?",
    "capabilities": ["orders", "products", "support"]
  }
}
```

## CLI Commands

```bash
# Start the gateway server
opencatalyst start

# Initialize a new project
opencatalyst init

# Show configuration status
opencatalyst status

# Interactive chat mode (for testing)
opencatalyst chat
```

## API Endpoints

Once running, the gateway exposes:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/chat` | POST | Send a chat message |
| `/api/chat/:sessionId/history` | GET | Get conversation history |
| `/api/products/search?q=...` | GET | Search products |
| `/api/orders/:orderId` | GET | Get order details |
| `/webhook/:channel` | POST | Incoming message webhook |

### Chat API Example

```bash
curl -X POST http://localhost:3939/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where is my order #1234?",
    "sessionId": "customer-123"
  }'
```

## SDK Usage

Use OpenCatalyst programmatically:

```typescript
import { createCatalyst, loadConfig } from 'opencatalyst';

const config = loadConfig();

const catalyst = createCatalyst({
  config,
  onMessage: (msg) => {
    console.log(`New message from ${msg.from}: ${msg.text}`);
  },
});

catalyst.start();
```

### Using Individual Integrations

```typescript
import { ShopifyIntegration } from 'opencatalyst/sdk';

const shopify = new ShopifyIntegration({
  storeDomain: 'my-store.myshopify.com',
  accessToken: 'your-access-token',
});

const order = await shopify.getOrder('#1234');
console.log(order);
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `OPENAI_API_KEY` | OpenAI API key (alternative to Anthropic) |
| `CATALYST_STORE_URL` | Store URL override |
| `CATALYST_STORE_PLATFORM` | Platform override |
| `SHOPIFY_ACCESS_TOKEN` | Shopify Admin API token |
| `SHOPIFY_STORE_DOMAIN` | Shopify store domain |
| `WOOCOMMERCE_KEY` | WooCommerce consumer key |
| `WOOCOMMERCE_SECRET` | WooCommerce consumer secret |
| `MEDUSA_BACKEND_URL` | Medusa backend URL |
| `MEDUSA_API_KEY` | Medusa API key |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) |

## Web Chat Widget

Embed the chat widget on your store:

```html
<script>
  (function(w, d, s, o) {
    var j = d.createElement(s);
    j.async = true;
    j.src = 'https://your-gateway.com/widget.js';
    j.onload = function() {
      w.OpenCatalyst.init({
        widgetId: 'your-widget-id',
        gatewayUrl: 'https://your-gateway.com'
      });
    };
    d.head.appendChild(j);
  })(window, document, 'script');
</script>
```

## Roadmap

- [x] Core gateway and API
- [x] Shopify integration
- [x] WooCommerce integration
- [x] Medusa integration
- [x] Memory/conversation persistence
- [ ] WhatsApp Business API (Baileys)
- [ ] Email channel (SMTP/IMAP)
- [ ] Web chat widget
- [ ] Returns and refunds workflow
- [ ] Multi-language support
- [ ] Analytics dashboard

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

MIT © Catalyst AI

---

Built with ❤️ by [Catalyst AI](https://askcatalyst.ai)
