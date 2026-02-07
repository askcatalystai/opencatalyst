// OpenCatalyst - AI assistant for ecommerce brands

// Core exports
export { Agent } from './agent/index.js';
export { loadConfig, validateConfig } from './config/loader.js';

// Store integrations
export { createStoreClient, MedusaStoreClient, ShopifyStoreClient } from './stores/index.js';

// Skills
export { loadSkills, getAvailableSkills } from './skills/index.js';

// Core systems (memory, soul, workspace)
export { MemoryStore, Soul, Workspace } from './core/index.js';
export type { MemoryEntry, Memory, SoulConfig, WorkspaceConfig, SessionData, CustomSkill } from './core/index.js';

// Types
export * from './types/index.js';

// Re-export Hono for custom extensions
export { Hono } from 'hono';
