import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          channel: 'web',
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
        <p className="text-sm text-gray-500">Ask about orders, products, or store operations</p>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-catalyst-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-catalyst-600" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              How can I help you today?
            </h2>
            <p className="text-gray-500 max-w-md">
              Ask me about orders, products, inventory, sales metrics, or anything else about your store.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'How are sales today?',
                'Any low stock items?',
                "Check order #1001",
                'Search for rice products',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-3 animate-fade-in',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-catalyst-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-catalyst-600" />
              </div>
            )}
            <div
              className={clsx(
                'max-w-[70%] rounded-2xl px-4 py-2.5',
                message.role === 'user'
                  ? 'bg-catalyst-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 bg-catalyst-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-catalyst-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-dot" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-catalyst-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-catalyst-600 text-white rounded-xl hover:bg-catalyst-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
