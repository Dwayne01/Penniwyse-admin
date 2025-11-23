import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const adminSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type AdminSignInFormData = z.infer<typeof adminSignInSchema>;

export const adminSignUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userType: z.string().optional(),
});

export type AdminSignUpFormData = z.infer<typeof adminSignUpSchema>;

