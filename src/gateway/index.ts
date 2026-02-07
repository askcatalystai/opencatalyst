import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { loadConfig } from '../config/loader.js';
import { Agent } from '../agent/index.js';
import type { Config } from '../types/index.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Global state
let agent: Agent | null = null;
let config: Config | null = null;

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'OpenCatalyst',
    version: '0.1.0',
    status: 'running',
    stores: config?.stores.length || 0,
    channels: config?.channels.length || 0,
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Chat endpoint
app.post('/api/chat', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  const body = await c.req.json<{
    message: string;
    sessionId?: string;
    channel?: string;
  }>();
  
  if (!body.message) {
    return c.json({ error: 'Message is required' }, 400);
  }
  
  const sessionId = body.sessionId || crypto.randomUUID();
  const channel = body.channel || 'api';
  
  try {
    const response = await agent.chat(body.message, sessionId, channel);
    return c.json({
      response,
      sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ 
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Ask endpoint (alias for chat)
app.post('/api/ask', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  const body = await c.req.json<{
    message: string;
    channel?: string;
  }>();
  
  if (!body.message) {
    return c.json({ error: 'Message is required' }, 400);
  }
  
  try {
    const response = await agent.chat(body.message, crypto.randomUUID(), body.channel || 'api');
    return c.json({ response });
  } catch (error) {
    console.error('Ask error:', error);
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

// Metrics endpoint
app.get('/api/metrics', async (c) => {
  if (!agent || !config?.stores[0]) {
    return c.json({ error: 'No store configured' }, 400);
  }
  
  try {
    const response = await agent.chat('Get today metrics', 'metrics', 'internal');
    return c.json({ response });
  } catch (error) {
    console.error('Metrics error:', error);
    return c.json({ error: 'Failed to get metrics' }, 500);
  }
});

// Session management
app.get('/api/sessions/:id', (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  const session = agent.getSession(c.req.param('id'));
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  
  return c.json({
    id: session.id,
    channel: session.channel,
    messageCount: session.messages.length,
    context: session.context,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
  });
});

app.delete('/api/sessions/:id', (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  agent.clearSession(c.req.param('id'));
  return c.json({ success: true });
});

// Config endpoint
app.get('/api/config', (c) => {
  if (!config) {
    return c.json({ error: 'Config not loaded' }, 500);
  }
  
  // Return safe config (no secrets)
  return c.json({
    name: config.name,
    model: config.model,
    stores: config.stores.map(s => ({
      name: s.name,
      platform: s.platform,
      url: s.url,
    })),
    channels: config.channels.map(ch => ({
      type: ch.type,
      enabled: ch.enabled,
    })),
    skills: config.skills,
  });
});

// Start server
async function start() {
  try {
    console.log('🚀 Starting OpenCatalyst...');
    
    // Load config
    config = await loadConfig();
    console.log(`📦 Loaded config: ${config.name}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Stores: ${config.stores.length}`);
    console.log(`   Skills: ${config.skills.join(', ')}`);
    
    // Initialize agent
    agent = new Agent(config);
    console.log('🤖 Agent initialized');
    
    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    
    serve({
      fetch: app.fetch,
      port,
    });
    
    console.log(`\n✅ OpenCatalyst running at http://localhost:${port}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /api/chat - Chat with the assistant`);
    console.log(`  POST /api/ask  - Quick question (no session)`);
    console.log(`  GET  /api/metrics - Store metrics`);
    console.log(`  GET  /api/config - Current configuration`);
    
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
