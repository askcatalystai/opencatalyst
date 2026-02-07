export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Memory {
  sessionId: string;
  messages: Message[];
  customer?: { email?: string; name?: string };
  createdAt: number;
  updatedAt: number;
}

// In-memory store (works in serverless)
const store = new Map<string, Memory>();

export async function getMemory(sessionId: string): Promise<Memory> {
  if (store.has(sessionId)) {
    return store.get(sessionId)!;
  }
  
  const memory: Memory = {
    sessionId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.set(sessionId, memory);
  return memory;
}

export async function saveMemory(sessionId: string, memory: Memory): Promise<void> {
  memory.updatedAt = Date.now();
  store.set(sessionId, memory);
}

export async function clearMemory(sessionId: string): Promise<void> {
  store.delete(sessionId);
}
