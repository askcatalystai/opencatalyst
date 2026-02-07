import { useState, useEffect } from 'react';
import { Brain, Search, Plus, Save, RefreshCw } from 'lucide-react';

export function Memory() {
  const [memory, setMemory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemory(data.content || '');
      }
    } catch (error) {
      console.error('Failed to fetch memory:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    setSaving(true);
    try {
      await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: memory }),
      });
    } catch (error) {
      console.error('Failed to save memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const searchMemory = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Failed to search memory:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Memory</h1>
              <p className="text-sm text-gray-500">Long-term store knowledge</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMemory}
              disabled={loading}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className={loading ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} />
            </button>
            <button
              onClick={saveMemory}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-catalyst-600 text-white rounded-lg hover:bg-catalyst-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMemory()}
              placeholder="Search memory..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-catalyst-500"
            />
          </div>
          <button
            onClick={searchMemory}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Search
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-2">
              Found {searchResults.length} results
            </div>
            <ul className="space-y-1">
              {searchResults.map((result, i) => (
                <li key={i} className="text-sm text-gray-700">
                  {result}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 p-6 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
          </div>
        ) : (
          <textarea
            value={memory}
            onChange={e => setMemory(e.target.value)}
            placeholder="# Store Memory

Add store knowledge here:
- Product information
- Policies
- Common issues
- Customer insights
"
            className="w-full h-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-catalyst-500"
          />
        )}
      </div>
    </div>
  );
}
