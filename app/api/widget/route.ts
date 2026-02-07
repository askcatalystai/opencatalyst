import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Widget script that can be embedded on any website
 * Just add: <script src="https://opencatalyst.vercel.app/api/widget"></script>
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  
  // Get configuration from query params or use defaults
  const searchParams = request.nextUrl.searchParams;
  const primaryColor = searchParams.get("color") || "#000000";
  const position = searchParams.get("position") || "right";
  const agentName = process.env.AGENT_NAME || "Catalyst";
  const greeting = process.env.AGENT_GREETING || "Hi! How can I help you today?";
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : request.nextUrl.origin;

  const widgetScript = `
(function() {
  'use strict';
  
  // Prevent double initialization
  if (window.OpenCatalyst) return;
  
  const CONFIG = {
    baseUrl: '${baseUrl}',
    agentName: '${agentName}',
    greeting: '${greeting}',
    primaryColor: '${primaryColor}',
    position: '${position}'
  };
  
  let sessionId = localStorage.getItem('oc_session') || null;
  let isOpen = false;
  let messages = [];
  
  // Styles
  const styles = document.createElement('style');
  styles.textContent = \`
    #oc-widget-container * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #oc-widget-button {
      position: fixed;
      bottom: 20px;
      \${CONFIG.position}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: \${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    #oc-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(0,0,0,0.2);
    }
    
    #oc-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    #oc-widget-chat {
      position: fixed;
      bottom: 90px;
      \${CONFIG.position}: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }
    
    #oc-widget-chat.open {
      display: flex;
      animation: oc-slide-up 0.3s ease;
    }
    
    @keyframes oc-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    #oc-widget-header {
      padding: 16px 20px;
      background: \${CONFIG.primaryColor};
      color: white;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    #oc-widget-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    #oc-widget-header p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }
    
    #oc-widget-close {
      margin-left: auto;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
    }
    
    #oc-widget-close:hover {
      opacity: 1;
    }
    
    #oc-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .oc-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .oc-message.user {
      align-self: flex-end;
      background: \${CONFIG.primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .oc-message.assistant {
      align-self: flex-start;
      background: #f1f3f5;
      color: #333;
      border-bottom-left-radius: 4px;
    }
    
    .oc-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: #f1f3f5;
      border-radius: 16px;
      align-self: flex-start;
    }
    
    .oc-typing span {
      width: 8px;
      height: 8px;
      background: #999;
      border-radius: 50%;
      animation: oc-bounce 1.4s infinite ease-in-out both;
    }
    
    .oc-typing span:nth-child(1) { animation-delay: -0.32s; }
    .oc-typing span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes oc-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    #oc-widget-input-container {
      padding: 12px 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    }
    
    #oc-widget-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    
    #oc-widget-input:focus {
      border-color: \${CONFIG.primaryColor};
    }
    
    #oc-widget-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: \${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #oc-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    #oc-widget-send svg {
      width: 20px;
      height: 20px;
      fill: white;
    }
  \`;
  document.head.appendChild(styles);
  
  // Create widget HTML
  const container = document.createElement('div');
  container.id = 'oc-widget-container';
  container.innerHTML = \`
    <button id="oc-widget-button" aria-label="Open chat">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
    </button>
    <div id="oc-widget-chat">
      <div id="oc-widget-header">
        <div>
          <h3>\${CONFIG.agentName}</h3>
          <p>Usually replies instantly</p>
        </div>
        <button id="oc-widget-close" aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div id="oc-widget-messages"></div>
      <div id="oc-widget-input-container">
        <input id="oc-widget-input" type="text" placeholder="Type a message..." autocomplete="off">
        <button id="oc-widget-send" aria-label="Send message">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  \`;
  document.body.appendChild(container);
  
  // Get elements
  const button = document.getElementById('oc-widget-button');
  const chat = document.getElementById('oc-widget-chat');
  const closeBtn = document.getElementById('oc-widget-close');
  const messagesEl = document.getElementById('oc-widget-messages');
  const input = document.getElementById('oc-widget-input');
  const sendBtn = document.getElementById('oc-widget-send');
  
  function renderMessages() {
    messagesEl.innerHTML = messages.map(m => 
      '<div class="oc-message ' + m.role + '">' + escapeHtml(m.content) + '</div>'
    ).join('');
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'oc-typing';
    typing.id = 'oc-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  
  function hideTyping() {
    const typing = document.getElementById('oc-typing');
    if (typing) typing.remove();
  }
  
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    messages.push({ role: 'user', content: text });
    renderMessages();
    
    sendBtn.disabled = true;
    showTyping();
    
    try {
      const res = await fetch(CONFIG.baseUrl + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId })
      });
      
      const data = await res.json();
      
      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem('oc_session', sessionId);
      }
      
      hideTyping();
      messages.push({ role: 'assistant', content: data.response });
      renderMessages();
    } catch (err) {
      hideTyping();
      messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
      renderMessages();
    }
    
    sendBtn.disabled = false;
    input.focus();
  }
  
  function toggle() {
    isOpen = !isOpen;
    chat.classList.toggle('open', isOpen);
    
    if (isOpen && messages.length === 0) {
      messages.push({ role: 'assistant', content: CONFIG.greeting });
      renderMessages();
    }
  }
  
  button.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);
  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Public API
  window.OpenCatalyst = {
    open: () => { if (!isOpen) toggle(); },
    close: () => { if (isOpen) toggle(); },
    send: sendMessage,
    reset: () => {
      sessionId = null;
      messages = [];
      localStorage.removeItem('oc_session');
      renderMessages();
    }
  };
})();
`;

  return new NextResponse(widgetScript, {
    headers: {
      "Content-Type": "application/javascript",
      "Access-Control-Allow-Origin": origin,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
