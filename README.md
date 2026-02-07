# OpenCatalyst 🚀

AI-powered ecommerce assistant. Works with any store. Embed anywhere with a single script tag.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faskcatalystai%2Fopencatalyst)

## Features

- 💬 **Chat Widget** — Embed with one script tag, works anywhere
- 🤖 **AI Support** — Claude or GPT-powered responses
- 📦 **Order Tracking** — Look up orders, shipping status, tracking
- 🔍 **Product Search** — AI-powered product discovery
- 📧 **Email Support** — Automated responses via Resend
- 🔗 **Integrations** — Shopify, WooCommerce via Composio
- 🧠 **Memory** — Remembers conversation context

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Faskcatalystai%2Fopencatalyst&env=ANTHROPIC_API_KEY,STORE_NAME)

### 2. Add Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
STORE_NAME=My Store
COMPOSIO_API_KEY=...   # Optional: for Shopify/WooCommerce
RESEND_API_KEY=...     # Optional: for email
```

### 3. Embed the Widget

Add this to your store, before `</body>`:

```html
<script src="https://your-app.vercel.app/api/widget"></script>
```

Customize with query params:
```html
<script src="https://your-app.vercel.app/api/widget?color=%23007bff&position=left"></script>
```

## API Reference

### Chat API

```bash
# Send message
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is my order?", "sessionId": "optional"}'

# Get history
curl https://your-app.vercel.app/api/chat?sessionId=xxx
```

### Webhook

Receive messages from WhatsApp, email, etc:

```
POST /api/webhook?channel=whatsapp
POST /api/webhook?channel=email
```

### Widget

```
GET /api/widget
GET /api/widget?color=#007bff&position=left
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (alternative) |
| `STORE_NAME` | No | Your store name |
| `AGENT_NAME` | No | AI agent name (default: Catalyst) |
| `COMPOSIO_API_KEY` | No | For Shopify/WooCommerce |
| `RESEND_API_KEY` | No | For email sending |

*At least one AI provider required

### Soul & Memory

OpenCatalyst uses OpenClaw-style workspace files:

- `.catalyst/SOUL.md` — Agent personality and behavior
- `.catalyst/MEMORY.md` — Persistent knowledge base
- `.catalyst/memory/` — Conversation history

## Architecture

```
app/
├── api/
│   ├── chat/         # Chat API endpoint
│   ├── webhook/      # Incoming webhooks
│   └── widget/       # Embeddable widget script
├── demo/             # Demo chat page
└── page.tsx          # Landing page

lib/
├── agent.ts          # AI agent with tools
├── composio.ts       # Shopify/WooCommerce via Composio
├── memory.ts         # Conversation persistence
└── config.ts         # Configuration
```

## Integrations

### Composio

Connect to 250+ apps via Composio:

1. Get API key from [composio.dev](https://composio.dev)
2. Add `COMPOSIO_API_KEY` to environment
3. Connect your Shopify/WooCommerce in Composio dashboard

### Resend

For email support:

1. Get API key from [resend.com](https://resend.com)
2. Add `RESEND_API_KEY` and `EMAIL_FROM` to environment

## Development

```bash
# Install
pnpm install

# Run locally
pnpm dev

# Build
pnpm build
```

## License

MIT © Catalyst AI
