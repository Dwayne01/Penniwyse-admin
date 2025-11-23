import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Select, Button } from '../../ui';
import { adminSignUpSchema, type AdminSignUpFormData } from '../../../utils/validators';
import { Mail, Lock } from 'lucide-react';

interface UserFormProps {
  onSubmit: (data: AdminSignUpFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminSignUpFormData>({
    resolver: zodResolver(adminSignUpSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        placeholder="user@example.com"
        error={errors.email?.message}
        {...register('email')}
        icon={<Mail className="w-5 h-5" />}
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter password (min 8 characters)"
        error={errors.password?.message}
        {...register('password')}
        icon={<Lock className="w-5 h-5" />}
        helperText="Must contain at least one uppercase letter, one lowercase letter, and one number"
      />

      <Select
        label="User Type (optional)"
        options={[
          { value: '', label: 'None' },
          { value: 'individual', label: 'Individual' },
          { value: 'business', label: 'Business' },
        ]}
        {...register('userType', {
          setValueAs: (v) => (v === '' ? undefined : v),
        })}
        error={errors.userType?.message}
      />

      <div className="flex gap-2">
        <Button type="submit" isLoading={isLoading}>
          Create User
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

