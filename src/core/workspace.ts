import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { MemoryStore } from './memory.js';
import { Soul } from './soul.js';

export interface WorkspaceConfig {
  path: string;
  storeName?: string;
}

/**
 * OpenCatalyst Workspace
 * 
 * Like OpenClaw's workspace — a directory containing:
 * - SOUL.md (personality)
 * - MEMORY.md (long-term knowledge)
 * - memory/ (daily notes)
 * - sessions/ (conversation history)
 * - skills/ (custom skills)
 */
export class Workspace {
  readonly path: string;
  readonly memory: MemoryStore;
  readonly soul: Soul;
  
  private sessionsPath: string;
  private skillsPath: string;
  
  constructor(config: WorkspaceConfig) {
    this.path = config.path;
    this.memory = new MemoryStore(this.path);
    this.soul = new Soul(this.path);
    this.sessionsPath = join(this.path, 'sessions');
    this.skillsPath = join(this.path, 'skills');
  }
  
  async init(): Promise<void> {
    // Create all directories
    const dirs = [
      this.path,
      join(this.path, 'memory'),
      this.sessionsPath,
      this.skillsPath,
    ];
    
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
    
    // Initialize memory and soul
    await this.memory.init();
    await this.soul.load();
    
    // Create AGENTS.md if not exists
    const agentsPath = join(this.path, 'AGENTS.md');
    if (!existsSync(agentsPath)) {
      await writeFile(agentsPath, DEFAULT_AGENTS_MD);
    }
  }
  
  /**
   * Save a session to disk
   */
  async saveSession(sessionId: string, data: SessionData): Promise<void> {
    const filepath = join(this.sessionsPath, `${sessionId}.json`);
    await writeFile(filepath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Load a session from disk
   */
  async loadSession(sessionId: string): Promise<SessionData | null> {
    const filepath = join(this.sessionsPath, `${sessionId}.json`);
    
    if (!existsSync(filepath)) {
      return null;
    }
    
    try {
      const content = await readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  
  /**
   * List all sessions
   */
  async listSessions(): Promise<string[]> {
    if (!existsSync(this.sessionsPath)) {
      return [];
    }
    
    const files = await readdir(this.sessionsPath);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }
  
  /**
   * Get context for AI prompt (memory + soul)
   */
  async getContext(): Promise<string> {
    const soulPrompt = this.soul.getSystemPrompt();
    const memoryContext = await this.memory.getContext();
    
    return `${soulPrompt}\n\n${memoryContext}`;
  }
  
  /**
   * Load custom skills from workspace
   */
  async loadCustomSkills(): Promise<CustomSkill[]> {
    if (!existsSync(this.skillsPath)) {
      return [];
    }
    
    const skills: CustomSkill[] = [];
    const files = await readdir(this.skillsPath);
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await readFile(join(this.skillsPath, file), 'utf-8');
        const skill = this.parseSkillMd(content, file.replace('.md', ''));
        if (skill) {
          skills.push(skill);
        }
      }
    }
    
    return skills;
  }
  
  private parseSkillMd(content: string, name: string): CustomSkill | null {
    const descMatch = content.match(/## Description\n([\s\S]*?)(?=\n## |$)/i);
    const triggersMatch = content.match(/## Triggers\n([\s\S]*?)(?=\n## |$)/i);
    const responseMatch = content.match(/## Response\n([\s\S]*?)(?=\n## |$)/i);
    
    if (!descMatch || !responseMatch) {
      return null;
    }
    
    const triggers = triggersMatch
      ? triggersMatch[1].split('\n').filter(l => l.startsWith('-')).map(l => l.slice(1).trim())
      : [];
    
    return {
      name,
      description: descMatch[1].trim(),
      triggers,
      responseTemplate: responseMatch[1].trim(),
    };
  }
}

export interface SessionData {
  id: string;
  channel: string;
  customerId?: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }[];
  context: Record<string, unknown>;
  createdAt: string;
  lastActivity: string;
}

export interface CustomSkill {
  name: string;
  description: string;
  triggers: string[];
  responseTemplate: string;
}

const DEFAULT_AGENTS_MD = `# AGENTS.md — OpenCatalyst Workspace

This is your OpenCatalyst workspace. It contains:

- **SOUL.md** — Your assistant's personality and voice
- **MEMORY.md** — Long-term knowledge about your store
- **memory/** — Daily notes and logs
- **sessions/** — Conversation history
- **skills/** — Custom skills (add .md files)

## Getting Started

1. Edit SOUL.md to customize your assistant's personality
2. Add store knowledge to MEMORY.md
3. Create custom skills in skills/ folder

## Custom Skills

Create a file like \`skills/shipping-info.md\`:

\`\`\`markdown
# Shipping Info

## Description
Provides shipping information and estimated delivery times.

## Triggers
- shipping
- delivery time
- how long

## Response
We offer two shipping options:
- **Standard (5-7 business days):** Free on orders over $50
- **Express (2-3 business days):** $9.99

Orders placed before 2 PM ship same day!
\`\`\`

---
*OpenCatalyst Workspace*
`;
