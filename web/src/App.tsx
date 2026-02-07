import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Memory } from './components/Memory';

type View = 'chat' | 'dashboard' | 'memory' | 'settings';

interface AppConfig {
  name: string;
  model: string;
  stores: { name: string; platform: string; url: string }[];
  skills: string[];
}

function App() {
  const [view, setView] = useState<View>('chat');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load config:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🚀</div>
          <div className="text-gray-500">Loading OpenCatalyst...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar 
        view={view} 
        setView={setView} 
        storeName={config?.name || 'OpenCatalyst'} 
      />
      
      <main className="flex-1 overflow-hidden">
        {view === 'chat' && <Chat />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'memory' && <Memory />}
        {view === 'settings' && <Settings config={config} />}
      </main>
    </div>
  );
}

export default App;
