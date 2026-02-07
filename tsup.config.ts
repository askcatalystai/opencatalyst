import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'gateway/index': 'src/gateway/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  splitting: false,
  bundle: true,
  external: ['@anthropic-ai/sdk', 'openai', '@shopify/shopify-api'],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
