import { apiClient } from '../apiClient';
import type { AdminSignInDto, AdminSignUpDto, AuthResponse } from '../../types/auth.types';

class AuthService {
  async adminSignIn(credentials: AdminSignInDto): Promise<AuthResponse> {
    const response = await apiClient.getClient().post<AuthResponse>(
      '/auth/admin/signin',
      credentials
    );
    
    // Store tokens
    if (response.data.tokens) {
      apiClient.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }
    
    return response.data;
  }

  async adminSignUp(data: AdminSignUpDto): Promise<AuthResponse> {
    const response = await apiClient.getClient().post<AuthResponse>(
      '/api/auth/admin/signup',
      data
    );
    
    // Note: We don't store tokens here since this is for creating users, not logging in
    // The tokens in the response are for the newly created user, not the admin creating them
    
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> {
    const response = await apiClient.getClient().post<{ tokens: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh',
      { refreshToken }
    );
    
    if (response.data.tokens) {
      apiClient.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }
    
    return response.data;
  }

  logout(): void {
    apiClient.clearAuth();
  }
}

export const authService = new AuthService();

