import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

export interface MemoryEntry {
  timestamp: Date;
  content: string;
  category?: string;
  importance?: 'low' | 'medium' | 'high';
}

export interface Memory {
  entries: MemoryEntry[];
  lastUpdated: Date;
}

/**
 * OpenCatalyst Memory System
 * 
 * Like OpenClaw's MEMORY.md but structured for ecommerce:
 * - Store knowledge (products, categories, policies)
 * - Customer insights (preferences, history)
 * - Operational notes (issues, resolutions)
 */
export class MemoryStore {
  private workspacePath: string;
  private memoryPath: string;
  private dailyPath: string;
  
  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.memoryPath = join(workspacePath, 'MEMORY.md');
    this.dailyPath = join(workspacePath, 'memory');
  }
  
  async init(): Promise<void> {
    // Create workspace if needed
    if (!existsSync(this.workspacePath)) {
      await mkdir(this.workspacePath, { recursive: true });
    }
    
    // Create memory directory
    if (!existsSync(this.dailyPath)) {
      await mkdir(this.dailyPath, { recursive: true });
    }
    
    // Initialize MEMORY.md if needed
    if (!existsSync(this.memoryPath)) {
      await this.writeMemory(DEFAULT_MEMORY);
    }
  }
  
  async readMemory(): Promise<string> {
    try {
      return await readFile(this.memoryPath, 'utf-8');
    } catch {
      return DEFAULT_MEMORY;
    }
  }
  
  async writeMemory(content: string): Promise<void> {
    await writeFile(this.memoryPath, content, 'utf-8');
  }
  
  async appendToMemory(entry: string, section?: string): Promise<void> {
    let content = await this.readMemory();
    
    if (section) {
      // Find section and append
      const sectionRegex = new RegExp(`(## ${section}[\\s\\S]*?)(?=\\n## |$)`);
      const match = content.match(sectionRegex);
      
      if (match) {
        const updatedSection = match[1].trimEnd() + '\n- ' + entry + '\n';
        content = content.replace(sectionRegex, updatedSection);
      } else {
        // Add new section
        content += `\n## ${section}\n- ${entry}\n`;
      }
    } else {
      // Append to end
      content += `\n- ${entry}`;
    }
    
    await this.writeMemory(content);
  }
  
  async getDailyNote(date?: Date): Promise<string> {
    const d = date || new Date();
    const filename = `${d.toISOString().split('T')[0]}.md`;
    const filepath = join(this.dailyPath, filename);
    
    try {
      return await readFile(filepath, 'utf-8');
    } catch {
      return '';
    }
  }
  
  async writeDailyNote(content: string, date?: Date): Promise<void> {
    const d = date || new Date();
    const filename = `${d.toISOString().split('T')[0]}.md`;
    const filepath = join(this.dailyPath, filename);
    
    await writeFile(filepath, content, 'utf-8');
  }
  
  async appendToDailyNote(entry: string, date?: Date): Promise<void> {
    const existing = await this.getDailyNote(date);
    const timestamp = new Date().toLocaleTimeString();
    const newContent = existing 
      ? `${existing}\n\n### ${timestamp}\n${entry}`
      : `# ${(date || new Date()).toISOString().split('T')[0]}\n\n### ${timestamp}\n${entry}`;
    
    await this.writeDailyNote(newContent, date);
  }
  
  /**
   * Search memory for relevant context
   */
  async search(query: string): Promise<string[]> {
    const results: string[] = [];
    const queryLower = query.toLowerCase();
    
    // Search main memory
    const memory = await this.readMemory();
    const lines = memory.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes(queryLower)) {
        results.push(line.trim());
      }
    }
    
    return results.slice(0, 10);
  }
  
  /**
   * Get context for AI prompt
   */
  async getContext(): Promise<string> {
    const memory = await this.readMemory();
    const today = await this.getDailyNote();
    const yesterday = await this.getDailyNote(new Date(Date.now() - 86400000));
    
    let context = '';
    
    if (memory) {
      context += `## Long-term Memory\n${memory.slice(0, 2000)}\n\n`;
    }
    
    if (today) {
      context += `## Today's Notes\n${today.slice(0, 1000)}\n\n`;
    }
    
    if (yesterday) {
      context += `## Yesterday's Notes\n${yesterday.slice(0, 500)}\n`;
    }
    
    return context;
  }
}

const DEFAULT_MEMORY = `# MEMORY.md — Store Knowledge

## Store Info
- Store name: (configure in opencatalyst.yaml)
- Platform: (shopify/medusa/woocommerce)

## Policies
- Return policy: 30 days for unused items
- Shipping: Standard (5-7 days), Express (2-3 days)

## Common Issues
- (Add frequently asked questions and resolutions here)

## Customer Insights
- (Add notable customer preferences or patterns)

## Products
- (Add product knowledge, popular items, recommendations)

---
*Updated by OpenCatalyst*
`;
