import Link from "next/link";

export default function Home() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
              <span className="text-white font-bold text-sm">OC</span>
            </div>
            <span className="font-semibold text-lg">OpenCatalyst</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-gray-600 hover:text-black">
              Features
            </Link>
            <Link href="#widget" className="text-sm text-gray-600 hover:text-black">
              Widget
            </Link>
            <Link
              href="https://github.com/askcatalystai/opencatalyst"
              className="text-sm text-gray-600 hover:text-black"
              target="_blank"
            >
              GitHub
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          AI Customer Support
          <br />
          <span className="text-gray-400">for Ecommerce</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          Connect AI to your store. Answer questions, track orders, recommend
          products. Works with Shopify, WooCommerce, Medusa, and any platform.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="#widget"
            className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition"
          >
            Get Widget Code
          </Link>
          <Link
            href="/demo"
            className="px-6 py-3 border border-gray-300 rounded-full font-medium hover:border-gray-400 transition"
          >
            Try Demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything you need
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="💬"
            title="Chat Widget"
            description="Embed a beautiful chat widget on any website with a single script tag."
          />
          <FeatureCard
            icon="🛒"
            title="Store Integration"
            description="Connect to Shopify, WooCommerce, or any platform via Composio."
          />
          <FeatureCard
            icon="📦"
            title="Order Tracking"
            description="Customers can check order status, tracking, and shipping updates."
          />
          <FeatureCard
            icon="🔍"
            title="Product Search"
            description="AI-powered product search and personalized recommendations."
          />
          <FeatureCard
            icon="📧"
            title="Email Support"
            description="Automated email responses powered by AI and Resend."
          />
          <FeatureCard
            icon="🧠"
            title="Conversation Memory"
            description="Remembers context across sessions for better support."
          />
        </div>
      </section>

      {/* Widget Code */}
      <section id="widget" className="bg-black text-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Add to Your Store
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Just paste this script tag before &lt;/body&gt;
          </p>
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-xl p-6 font-mono text-sm">
            <code className="text-green-400">
              &lt;script src=&quot;{baseUrl}/api/widget&quot;&gt;&lt;/script&gt;
            </code>
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-400 text-sm">
              Customize with query params: ?color=#007bff&position=left
            </p>
          </div>
        </div>
      </section>

      {/* API Docs */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-16">API Reference</h2>
        <div className="max-w-3xl mx-auto space-y-8">
          <ApiEndpoint
            method="POST"
            path="/api/chat"
            description="Send a chat message"
            body='{ "message": "Where is my order?", "sessionId": "optional" }'
          />
          <ApiEndpoint
            method="GET"
            path="/api/chat?sessionId=xxx"
            description="Get conversation history"
          />
          <ApiEndpoint
            method="POST"
            path="/api/webhook?channel=whatsapp"
            description="Webhook for incoming messages"
          />
          <ApiEndpoint
            method="GET"
            path="/api/widget"
            description="Get embeddable widget script"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500">
          <p>Built by Catalyst AI</p>
          <p className="mt-2 text-sm">
            Open source on{" "}
            <Link
              href="https://github.com/askcatalystai/opencatalyst"
              className="underline hover:text-black"
            >
              GitHub
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 transition">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function ApiEndpoint({
  method,
  path,
  description,
  body,
}: {
  method: string;
  path: string;
  description: string;
  body?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            method === "GET"
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <div className="px-6 py-4">
        <p className="text-gray-600 text-sm">{description}</p>
        {body && (
          <pre className="mt-3 bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}
