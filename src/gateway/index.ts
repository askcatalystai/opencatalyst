import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from '../config/loader.js';
import { Agent } from '../agent/index.js';
import type { Config } from '../types/index.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// Global state
let agent: Agent | null = null;
let config: Config | null = null;

// ============ API Routes ============

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

// Get config (safe - no secrets)
app.get('/api/config', (c) => {
  if (!config) {
    return c.json({ error: 'Config not loaded' }, 500);
  }
  
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

// Ask endpoint (one-shot, no session)
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

// ============ Memory API ============

app.get('/api/memory', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  try {
    const workspace = agent.getWorkspace();
    const content = await workspace.memory.readMemory();
    return c.json({ content });
  } catch (error) {
    console.error('Memory read error:', error);
    return c.json({ error: 'Failed to read memory' }, 500);
  }
});

app.put('/api/memory', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  const body = await c.req.json<{ content: string }>();
  
  try {
    const workspace = agent.getWorkspace();
    await workspace.memory.writeMemory(body.content);
    return c.json({ success: true });
  } catch (error) {
    console.error('Memory write error:', error);
    return c.json({ error: 'Failed to write memory' }, 500);
  }
});

app.get('/api/memory/search', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  const query = c.req.query('q');
  if (!query) {
    return c.json({ error: 'Query required' }, 400);
  }
  
  try {
    const workspace = agent.getWorkspace();
    const results = await workspace.memory.search(query);
    return c.json({ results });
  } catch (error) {
    console.error('Memory search error:', error);
    return c.json({ error: 'Failed to search memory' }, 500);
  }
});

// ============ Soul API ============

app.get('/api/soul', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  try {
    const workspace = agent.getWorkspace();
    const soul = workspace.soul.getConfig();
    return c.json(soul);
  } catch (error) {
    console.error('Soul read error:', error);
    return c.json({ error: 'Failed to read soul' }, 500);
  }
});

// ============ Sessions API ============

app.get('/api/sessions', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  try {
    const sessions = await agent.listSessions();
    return c.json({
      sessions: sessions.map(s => ({
        id: s.id,
        channel: s.channel,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
      })),
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    return c.json({ error: 'Failed to list sessions' }, 500);
  }
});

app.get('/api/sessions/:id', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  try {
    const session = await agent.getSession(c.req.param('id'));
    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }
    
    return c.json({
      id: session.id,
      channel: session.channel,
      messages: session.messages,
      context: session.context,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });
  } catch (error) {
    console.error('Session get error:', error);
    return c.json({ error: 'Failed to get session' }, 500);
  }
});

app.delete('/api/sessions/:id', async (c) => {
  if (!agent) {
    return c.json({ error: 'Agent not initialized' }, 500);
  }
  
  await agent.clearSession(c.req.param('id'));
  return c.json({ success: true });
});

// ============ Static Files (Web UI) ============

// Check if built web exists
const webDistPath = join(process.cwd(), 'dist', 'web');
if (existsSync(webDistPath)) {
  app.use('/*', serveStatic({ root: './dist/web' }));
}

// Root redirect to web UI or API info
app.get('/', (c) => {
  if (existsSync(webDistPath)) {
    return c.redirect('/index.html');
  }
  
  return c.json({
    name: 'OpenCatalyst',
    version: '0.1.0',
    status: 'running',
    stores: config?.stores.length || 0,
    docs: {
      chat: 'POST /api/chat',
      ask: 'POST /api/ask',
      memory: 'GET/PUT /api/memory',
      sessions: 'GET /api/sessions',
      config: 'GET /api/config',
    },
    web: 'Run `pnpm web:build` to enable web UI',
  });
});

// ============ Start Server ============

async function start() {
  try {
    console.log('🚀 Starting OpenCatalyst...\n');
    
    // Load config
    config = await loadConfig();
    console.log(`📦 Store: ${config.name}`);
    console.log(`🤖 Model: ${config.model}`);
    console.log(`🛠️  Skills: ${config.skills.join(', ')}`);
    
    // Determine workspace path
    const workspacePath = process.env.OPENCATALYST_WORKSPACE 
      || join(process.env.HOME || '', '.opencatalyst');
    console.log(`📁 Workspace: ${workspacePath}`);
    
    // Initialize agent
    agent = new Agent(config, workspacePath);
    await agent.init();
    
    // Start server
    const port = parseInt(process.env.PORT || '3000', 10);
    
    serve({
      fetch: app.fetch,
      port,
    });
    
    console.log(`\n✅ OpenCatalyst running at http://localhost:${port}`);
    console.log(`\n📡 API Endpoints:`);
    console.log(`   POST /api/chat    - Chat with session`);
    console.log(`   POST /api/ask     - Quick question`);
    console.log(`   GET  /api/memory  - Read memory`);
    console.log(`   GET  /api/config  - Configuration`);
    
    if (existsSync(webDistPath)) {
      console.log(`\n🌐 Web UI: http://localhost:${port}`);
    } else {
      console.log(`\n💡 Run \`pnpm dev\` for live web UI at http://localhost:3001`);
    }
    
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();
