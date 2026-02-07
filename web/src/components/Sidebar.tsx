import { MessageSquare, LayoutDashboard, Brain, Settings, Sparkles } from 'lucide-react';
import clsx from 'clsx';

type View = 'chat' | 'dashboard' | 'memory' | 'settings';

interface SidebarProps {
  view: View;
  setView: (view: View) => void;
  storeName: string;
}

const navItems: { id: View; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ view, setView, storeName }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-catalyst-400 to-catalyst-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">OpenCatalyst</div>
            <div className="text-xs text-gray-500">{storeName}</div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                onClick={() => setView(id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  view === id
                    ? 'bg-catalyst-50 text-catalyst-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          OpenCatalyst v0.1.0
        </div>
      </div>
    </aside>
  );
}
