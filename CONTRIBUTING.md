# Contributing to OpenCatalyst

Thanks for your interest in contributing! 🚀

## Development Setup

```bash
# Clone the repo
git clone https://github.com/askcatalystai/opencatalyst.git
cd opencatalyst

# Install dependencies
pnpm install

# Copy example config
cp opencatalyst.example.yaml opencatalyst.yaml
cp .env.example .env

# Start development server
pnpm dev
```

## Project Structure

```
opencatalyst/
├── src/
│   ├── agent/          # AI agent (Anthropic/OpenAI)
│   ├── cli/            # CLI commands
│   ├── config/         # Config loading & validation
│   ├── gateway/        # HTTP server (Hono)
│   ├── skills/         # Built-in skills
│   ├── stores/         # Store integrations
│   │   ├── base.ts     # Abstract base client
│   │   ├── medusa.ts   # Medusa.js integration
│   │   └── shopify.ts  # Shopify integration
│   ├── types/          # TypeScript types
│   └── index.ts        # Main exports
├── opencatalyst.example.yaml
├── package.json
└── tsconfig.json
```

## Adding a New Store Integration

1. Create `src/stores/[platform].ts`
2. Extend `BaseStoreClient`
3. Implement all required methods
4. Add to `src/stores/index.ts`

Example:

```typescript
// src/stores/woocommerce.ts
import { BaseStoreClient } from './base.js';

export class WooCommerceStoreClient extends BaseStoreClient {
  platform = 'woocommerce' as const;
  
  async getOrder(id: string): Promise<Order | null> {
    // Implementation
  }
  
  // ... other methods
}
```

## Adding a New Skill

1. Add to `src/skills/index.ts`
2. Register in the `builtinSkills` Map

```typescript
builtinSkills.set('my-skill', {
  name: 'my-skill',
  description: 'What it does',
  triggers: ['trigger words'],
  
  async run(ctx: SkillContext): Promise<SkillResult> {
    // Implementation
    return { response: 'Result' };
  },
});
```

## Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting (default settings)

## Testing

```bash
pnpm test
```

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a PR

## License

MIT
