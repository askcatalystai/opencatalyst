import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface SoulConfig {
  name: string;
  emoji: string;
  personality: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  language: string;
  brandVoice?: string;
  doNotMention?: string[];
  alwaysMention?: string[];
  signOff?: string;
}

/**
 * OpenCatalyst Soul System
 * 
 * Like OpenClaw's SOUL.md — defines the AI's personality,
 * brand voice, and communication style.
 */
export class Soul {
  private workspacePath: string;
  private soulPath: string;
  private config: SoulConfig;
  
  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.soulPath = join(workspacePath, 'SOUL.md');
    this.config = DEFAULT_SOUL;
  }
  
  async load(): Promise<SoulConfig> {
    if (!existsSync(this.soulPath)) {
      await this.save(DEFAULT_SOUL);
      return DEFAULT_SOUL;
    }
    
    try {
      const content = await readFile(this.soulPath, 'utf-8');
      this.config = this.parseSoulMd(content);
      return this.config;
    } catch {
      return DEFAULT_SOUL;
    }
  }
  
  async save(config: SoulConfig): Promise<void> {
    this.config = config;
    const content = this.toSoulMd(config);
    await writeFile(this.soulPath, content, 'utf-8');
  }
  
  getConfig(): SoulConfig {
    return this.config;
  }
  
  /**
   * Get system prompt based on soul configuration
   */
  getSystemPrompt(): string {
    const { name, personality, tone, brandVoice, doNotMention, alwaysMention, signOff } = this.config;
    
    let prompt = `You are ${name}, an AI assistant for an ecommerce store.\n\n`;
    
    prompt += `## Personality\n${personality}\n\n`;
    
    prompt += `## Communication Style\n`;
    prompt += `- Tone: ${tone}\n`;
    
    if (brandVoice) {
      prompt += `- Brand voice: ${brandVoice}\n`;
    }
    
    if (doNotMention?.length) {
      prompt += `\n## Never Mention\n`;
      for (const item of doNotMention) {
        prompt += `- ${item}\n`;
      }
    }
    
    if (alwaysMention?.length) {
      prompt += `\n## Always Include When Relevant\n`;
      for (const item of alwaysMention) {
        prompt += `- ${item}\n`;
      }
    }
    
    if (signOff) {
      prompt += `\n## Sign Off\nEnd messages with: "${signOff}"\n`;
    }
    
    return prompt;
  }
  
  private parseSoulMd(content: string): SoulConfig {
    const config: SoulConfig = { ...DEFAULT_SOUL };
    
    // Parse name
    const nameMatch = content.match(/^#\s*(.+?)(?:\s*[-—]|$)/m);
    if (nameMatch) {
      config.name = nameMatch[1].trim();
    }
    
    // Parse emoji
    const emojiMatch = content.match(/Emoji:\s*(.+)/i);
    if (emojiMatch) {
      config.emoji = emojiMatch[1].trim();
    }
    
    // Parse personality section
    const personalityMatch = content.match(/## Personality\n([\s\S]*?)(?=\n## |$)/i);
    if (personalityMatch) {
      config.personality = personalityMatch[1].trim();
    }
    
    // Parse tone
    const toneMatch = content.match(/Tone:\s*(\w+)/i);
    if (toneMatch) {
      config.tone = toneMatch[1].toLowerCase() as SoulConfig['tone'];
    }
    
    // Parse brand voice
    const brandMatch = content.match(/Brand (?:voice|style):\s*(.+)/i);
    if (brandMatch) {
      config.brandVoice = brandMatch[1].trim();
    }
    
    return config;
  }
  
  private toSoulMd(config: SoulConfig): string {
    return `# ${config.name} — Store Assistant

**Emoji:** ${config.emoji}

## Personality
${config.personality}

## Communication Style
- **Tone:** ${config.tone}
${config.brandVoice ? `- **Brand Voice:** ${config.brandVoice}` : ''}
- **Language:** ${config.language}

${config.doNotMention?.length ? `## Never Mention
${config.doNotMention.map(x => `- ${x}`).join('\n')}
` : ''}
${config.alwaysMention?.length ? `## Always Include When Relevant
${config.alwaysMention.map(x => `- ${x}`).join('\n')}
` : ''}
${config.signOff ? `## Sign Off
End messages with: "${config.signOff}"
` : ''}
---
*This file defines ${config.name}'s personality. Edit freely.*
`;
  }
}

const DEFAULT_SOUL: SoulConfig = {
  name: 'Catalyst',
  emoji: '🚀',
  personality: `Helpful, knowledgeable, and efficient. I focus on solving problems quickly while being warm and approachable. I know the store inside-out and genuinely want customers to find what they're looking for.`,
  tone: 'friendly',
  language: 'en',
  brandVoice: 'Warm but professional. Clear and concise. Helpful without being pushy.',
  alwaysMention: ['free shipping over $50', 'easy returns'],
  signOff: 'Happy shopping! 🛍️',
};
