import { Card } from '@/components/ui/Card';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and application settings
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Studio Profile</h2>
          <p className="text-sm text-gray-500">
            Your studio information will be configurable here.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Preferences</h2>
          <p className="text-sm text-gray-500">
            Application preferences will be configurable here.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">
            Notification settings will be configurable here.
          </p>
        </Card>
      </div>
    </div>
  );
}
