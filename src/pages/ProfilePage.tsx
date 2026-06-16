import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import * as profileService from '@/services/supabase/profiles';
import { uploadStudioLogo } from '@/services/supabase/storage';
import { Building2, Upload, X, Loader2 } from 'lucide-react';

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
  const [studioLogoUrl, setStudioLogoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setStudioName(profile.studio_name || '');
      setOwnerName(profile.owner_name || '');
      setPhoneNumber(profile.phone_number || '');
      setStudioLogoUrl(profile.studio_logo_url || '');
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const result = await uploadStudioLogo(file);
      await profileService.updateProfile({ studio_logo_url: result.url });
      setStudioLogoUrl(result.url);
      await loadProfile();
      showToast('Logo uploaded', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      showToast(message, 'error');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    try {
      await profileService.updateProfile({ studio_logo_url: '' });
      setStudioLogoUrl('');
      await loadProfile();
      showToast('Logo removed', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove logo';
      showToast(message, 'error');
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
            {studioLogoUrl ? (
              <img src={studioLogoUrl} alt="Logo" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            )}
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
              <p className="mb-2 text-sm font-medium text-gray-700">Studio Logo</p>
              <div className="flex items-center gap-3">
                {studioLogoUrl ? (
                  <div className="relative">
                    <img src={studioLogoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {studioLogoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                PNG, JPEG or WebP. Shown on share pages, previews, and reports.
              </p>
            </div>

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
