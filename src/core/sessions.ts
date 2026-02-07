import type { Session, Message } from '../types/index.js';
import type { Workspace, SessionData } from './workspace.js';

/**
 * Session Manager
 * 
 * Handles conversation sessions with persistence
 */
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private workspace: Workspace;
  
  constructor(workspace: Workspace) {
    this.workspace = workspace;
  }
  
  async get(sessionId: string): Promise<Session | null> {
    // Check in-memory first
    let session = this.sessions.get(sessionId);
    if (session) return session;
    
    // Try to load from disk
    const data = await this.workspace.loadSession(sessionId);
    if (data) {
      session = this.dataToSession(data);
      this.sessions.set(sessionId, session);
      return session;
    }
    
    return null;
  }
  
  async create(sessionId: string, channel: string, customerId?: string): Promise<Session> {
    const session: Session = {
      id: sessionId,
      channel,
      customerId,
      messages: [],
      context: {
        store: 'default',
      },
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    
    this.sessions.set(sessionId, session);
    await this.save(session);
    
    return session;
  }
  
  async getOrCreate(sessionId: string, channel: string, customerId?: string): Promise<Session> {
    const existing = await this.get(sessionId);
    if (existing) return existing;
    return this.create(sessionId, channel, customerId);
  }
  
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) return;
    
    session.messages.push(message);
    session.lastActivity = new Date();
    
    await this.save(session);
  }
  
  async save(session: Session): Promise<void> {
    const data = this.sessionToData(session);
    await this.workspace.saveSession(session.id, data);
  }
  
  async list(): Promise<Session[]> {
    const ids = await this.workspace.listSessions();
    const sessions: Session[] = [];
    
    for (const id of ids) {
      const session = await this.get(id);
      if (session) sessions.push(session);
    }
    
    return sessions.sort((a, b) => 
      b.lastActivity.getTime() - a.lastActivity.getTime()
    );
  }
  
  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    // Note: Could also delete from disk if needed
  }
  
  async getRecentSessions(limit = 10): Promise<Session[]> {
    const all = await this.list();
    return all.slice(0, limit);
  }
  
  private sessionToData(session: Session): SessionData {
    return {
      id: session.id,
      channel: session.channel,
      customerId: session.customerId,
      messages: session.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
      context: session.context as Record<string, unknown>,
      createdAt: session.createdAt.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
    };
  }
  
  private dataToSession(data: SessionData): Session {
    return {
      id: data.id,
      channel: data.channel,
      customerId: data.customerId,
      messages: data.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
      })),
      context: {
        store: (data.context.store as string) || 'default',
        orderId: data.context.orderId as string | undefined,
        productId: data.context.productId as string | undefined,
        intent: data.context.intent as string | undefined,
        metadata: data.context.metadata as Record<string, unknown> | undefined,
      },
      createdAt: new Date(data.createdAt),
      lastActivity: new Date(data.lastActivity),
    };
  }
}
