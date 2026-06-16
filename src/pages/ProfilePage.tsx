import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import * as profileService from '@/services/supabase/profiles';
import { Building2 } from 'lucide-react';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function ProfilePage() {
  const { user, profile, loadProfile } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [studioName, setStudioName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setStudioName(profile.studio_name || '');
      setOwnerName(profile.owner_name || '');
      setPhoneNumber(profile.phone_number || '');
    }
  }, [profile]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (phoneNumber && !isValidPhone(phoneNumber)) {
      newErrors.phone_number = 'Please enter a valid phone number (10-15 digits)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await profileService.updateProfile({
        studio_name: studioName,
        owner_name: ownerName,
        phone_number: phoneNumber,
      });
      await loadProfile();
      showToast('Profile saved successfully', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your studio and personal information
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {profile?.studio_name || user?.full_name || 'Your Studio'}
              </h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-5">
            <div>
              <Input
                label="Studio Name"
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="Your studio name"
              />
              <p className="mt-1 text-xs text-gray-400">
                Used across share pages and client communications
              </p>
            </div>

            <Input
              label="Owner Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Your full name"
            />

            <Input
              label="Phone Number"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              error={errors.phone_number}
            />

            <Input
              label="Email"
              type="email"
              value={user?.email ?? ''}
              readOnly
            />

            <div className="pt-2 flex gap-3">
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
