import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { Config } from '../types/index.js';

const StoreSchema = z.object({
  name: z.string(),
  platform: z.enum(['shopify', 'medusa', 'woocommerce']),
  url: z.string().url(),
  apiKey: z.string().optional(),
  accessToken: z.string().optional(),
});

const ChannelSchema = z.object({
  type: z.enum(['slack', 'webchat', 'whatsapp', 'email']),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});

const WorkflowTriggerSchema = z.object({
  type: z.enum(['event', 'schedule', 'webhook']),
  event: z.string().optional(),
  schedule: z.string().optional(),
  threshold: z.number().optional(),
});

const WorkflowActionSchema = z.object({
  type: z.enum(['notify', 'email', 'whatsapp', 'webhook', 'custom']),
  target: z.string().optional(),
  template: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const WorkflowSchema = z.object({
  name: z.string(),
  trigger: WorkflowTriggerSchema,
  actions: z.array(WorkflowActionSchema),
});

const ConfigSchema = z.object({
  name: z.string().default('OpenCatalyst Store'),
  model: z.string().default('claude-sonnet-4'),
  stores: z.array(StoreSchema).default([]),
  channels: z.array(ChannelSchema).default([]),
  skills: z.array(z.string()).default([
    'order-lookup',
    'customer-support',
    'inventory-alerts',
  ]),
  workflows: z.array(WorkflowSchema).default([]),
});

const CONFIG_FILES = [
  'opencatalyst.yaml',
  'opencatalyst.yml',
  'opencatalyst.json',
  '.opencatalyst.yaml',
  '.opencatalyst.yml',
];

function interpolateEnvVars(content: string): string {
  return content.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const value = process.env[varName];
    if (!value) {
      console.warn(`Warning: Environment variable ${varName} is not set`);
      return '';
    }
    return value;
  });
}

export async function loadConfig(configPath?: string): Promise<Config> {
  let filePath = configPath;
  
  if (!filePath) {
    for (const file of CONFIG_FILES) {
      if (existsSync(file)) {
        filePath = file;
        break;
      }
    }
  }
  
  if (!filePath || !existsSync(filePath)) {
    console.log('No config file found, using defaults');
    return ConfigSchema.parse({});
  }
  
  const content = await readFile(filePath, 'utf-8');
  const interpolated = interpolateEnvVars(content);
  
  let parsed: unknown;
  if (filePath.endsWith('.json')) {
    parsed = JSON.parse(interpolated);
  } else {
    parsed = parseYaml(interpolated);
  }
  
  return ConfigSchema.parse(parsed);
}

export function validateConfig(config: unknown): Config {
  return ConfigSchema.parse(config);
}
