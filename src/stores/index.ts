import type { Store, StoreClient } from '../types/index.js';
import { MedusaStoreClient } from './medusa.js';
import { ShopifyStoreClient } from './shopify.js';

export function createStoreClient(config: Store): StoreClient {
  switch (config.platform) {
    case 'medusa':
      return new MedusaStoreClient(config);
    case 'shopify':
      return new ShopifyStoreClient(config);
    case 'woocommerce':
      throw new Error('WooCommerce integration coming soon');
    default:
      throw new Error(`Unknown platform: ${config.platform}`);
  }
}

export { MedusaStoreClient } from './medusa.js';
export { ShopifyStoreClient } from './shopify.js';
