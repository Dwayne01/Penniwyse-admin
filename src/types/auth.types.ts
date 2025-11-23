export interface AdminSignInDto {
  email: string;
  password: string;
}

export interface AdminSignUpDto {
  email: string;
  password: string;
  userType?: string;
}

export interface AuthResponse {
  user: SanitizedUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export interface SanitizedUser {
  id: number;
  email: string;
  type?: string;
  role: UserRole;
  createdAt: Date;
}

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: SanitizedUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

