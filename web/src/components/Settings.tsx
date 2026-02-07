import { Settings as SettingsIcon, Store, Cpu, Zap, Check } from 'lucide-react';

interface SettingsProps {
  config: {
    name: string;
    model: string;
    stores: { name: string; platform: string; url: string }[];
    skills: string[];
  } | null;
}

export function Settings({ config }: SettingsProps) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Configure your OpenCatalyst instance</p>
          </div>
        </div>

        {/* Config Display */}
        <div className="space-y-6">
          {/* General */}
          <Section title="General" icon={SettingsIcon}>
            <Field label="Store Name" value={config?.name || 'Not configured'} />
            <Field label="AI Model" value={config?.model || 'claude-sonnet-4'} />
          </Section>

          {/* Connected Stores */}
          <Section title="Connected Stores" icon={Store}>
            {config?.stores?.length ? (
              <div className="space-y-3">
                {config.stores.map((store, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-catalyst-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-catalyst-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{store.name}</div>
                      <div className="text-sm text-gray-500">{store.platform} • {store.url}</div>
                    </div>
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No stores connected. Configure in opencatalyst.yaml</p>
            )}
          </Section>

          {/* Skills */}
          <Section title="Active Skills" icon={Zap}>
            {config?.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {config.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-catalyst-100 text-catalyst-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No skills enabled</p>
            )}
          </Section>

          {/* System Info */}
          <Section title="System" icon={Cpu}>
            <Field label="Version" value="0.1.0" />
            <Field label="API Endpoint" value="http://localhost:3000/api" />
            <Field label="Workspace" value="~/.opencatalyst" />
          </Section>
        </div>

        {/* Config File Note */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> To change settings, edit your <code className="bg-gray-200 px-1 py-0.5 rounded">opencatalyst.yaml</code> file and restart the server.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof SettingsIcon; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-500" />
        <h2 className="font-medium text-gray-900">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
