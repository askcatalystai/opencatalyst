import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'gateway/index': 'src/gateway/index.ts',
    'agent/index': 'src/agent/index.ts',
    'stores/index': 'src/stores/index.ts',
    'core/index': 'src/core/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  splitting: false,
  external: ['@anthropic-ai/sdk', 'openai', '@shopify/shopify-api'],
  esbuildOptions(options) {
    options.banner = {
      js: '// OpenCatalyst - AI for Ecommerce',
    };
  },
});
