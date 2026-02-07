import { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Package, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

interface Metrics {
  orders: number;
  revenue: string;
  averageOrderValue: string;
  topProducts: { name: string; sold: number }[];
  lowStockAlerts: number;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Get ${period} metrics`,
          sessionId: 'dashboard',
          channel: 'dashboard',
        }),
      });
      const data = await res.json();
      
      // Parse the response to extract metrics
      // In a real implementation, we'd have a dedicated metrics endpoint
      const parsed = parseMetricsFromResponse(data.response);
      setMetrics(parsed);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const parseMetricsFromResponse = (response: string): Metrics => {
    // Simple parsing - in production, use a dedicated endpoint
    return {
      orders: extractNumber(response, /Orders?:?\s*(\d+)/i) || 0,
      revenue: extractString(response, /Revenue:?\s*(\$[\d,]+\.?\d*)/i) || '$0',
      averageOrderValue: extractString(response, /Avg(?:erage)?\s*(?:Order)?:?\s*(\$[\d,]+\.?\d*)/i) || '$0',
      topProducts: [],
      lowStockAlerts: extractNumber(response, /low\s*stock:?\s*(\d+)/i) || 0,
    };
  };

  const extractNumber = (text: string, regex: RegExp): number | null => {
    const match = text.match(regex);
    return match ? parseInt(match[1], 10) : null;
  };

  const extractString = (text: string, regex: RegExp): string | null => {
    const match = text.match(regex);
    return match ? match[1] : null;
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Store performance at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  period === p
                    ? 'bg-catalyst-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-5 h-5 text-gray-600', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ShoppingCart}
          label="Orders"
          value={metrics?.orders?.toString() || '—'}
          loading={loading}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={metrics?.revenue || '—'}
          loading={loading}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Order"
          value={metrics?.averageOrderValue || '—'}
          loading={loading}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={metrics?.lowStockAlerts?.toString() || '—'}
          loading={loading}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon={Package} label="Check Inventory" />
          <QuickAction icon={ShoppingCart} label="Recent Orders" />
          <QuickAction icon={AlertTriangle} label="Low Stock Alert" />
          <QuickAction icon={TrendingUp} label="Sales Report" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof ShoppingCart;
  label: string;
  value: string;
  loading: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const colorMap = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
};

function StatCard({ icon: Icon, label, value, loading, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {loading ? (
          <div className="h-8 w-20 bg-gray-100 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: typeof ShoppingCart; label: string }) {
  return (
    <button className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
      <Icon className="w-5 h-5 text-gray-500" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}
