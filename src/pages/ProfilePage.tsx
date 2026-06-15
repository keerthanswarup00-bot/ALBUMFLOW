import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { User } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <User className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {user?.full_name}
              </h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4">
            <Input label="Full Name" value={user?.full_name ?? ''} readOnly />
            <Input label="Email" type="email" value={user?.email ?? ''} readOnly />
            <Input label="Studio Name" placeholder="Your studio name" />
            <Input label="Phone" type="tel" placeholder="+1 (555) 000-0000" />
            <Input label="Website" type="url" placeholder="https://yourstudio.com" />
            <div className="pt-2">
              <Button disabled>Save Changes (Coming Soon)</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
