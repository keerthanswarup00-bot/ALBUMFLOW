import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants/routes';

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function CreateStudioPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [studioName, setStudioName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!studioName.trim()) newErrors.studio_name = 'Studio name is required';
    if (!ownerName.trim()) newErrors.owner_name = 'Owner name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (phoneNumber && !isValidPhone(phoneNumber)) {
      newErrors.phone_number = 'Please enter a valid phone number (10-15 digits)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    try {
      await signUp(email, password, {
        studio_name: studioName.trim(),
        owner_name: ownerName.trim(),
        phone_number: phoneNumber.trim(),
      });
      showToast('Account created! Welcome to AlbumFlow.', 'success');
      navigate(ROUTES.DASHBOARD);
    } catch {
      // error is set in store
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Create Studio Account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set up your studio to get started
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Studio Name"
          value={studioName}
          onChange={(e) => setStudioName(e.target.value)}
          placeholder="Your Studio Name"
          error={errors.studio_name}
          required
        />
        <Input
          label="Owner Name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="Your full name"
          error={errors.owner_name}
          required
        />
        <Input
          label="Phone Number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+91 98765 43210"
          error={errors.phone_number}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="studio@example.com"
          error={errors.email}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          error={errors.password}
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
          Create Account
        </Button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
