import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import * as profileService from '@/services/supabase/profiles';
import { Building2, Trash2 } from 'lucide-react';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function SettingsPage() {
  const { profile, loadProfile } = useAuthStore();
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
      showToast('Studio information saved', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your studio and account settings
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Studio Information</h2>
              <p className="text-sm text-gray-500">
                This information appears on share pages and client communications
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <Input
              label="Studio Name"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
              placeholder="Your studio name"
            />
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
            <div>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Danger Zone</h2>
              <p className="text-sm text-gray-500">
                Irreversible actions affecting your account
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-red-900">Delete Account</p>
                <p className="text-xs text-red-600">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <Button variant="danger" disabled>
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
