import { apiClient } from '../apiClient';
import type { SendEmailDto, SendEmailResponse } from '../../types/email.types';

class EmailService {
  async sendEmail(data: SendEmailDto): Promise<SendEmailResponse> {
    try {
      const response = await apiClient.getClient().post<SendEmailResponse>(
        '/api/admin/users/send-email',
        data
      );
      return response.data;
    } catch (error: any) {
      // Handle 404 - endpoint might not exist yet
      if (error?.response?.status === 404) {
        throw new Error('Email sending endpoint not available. The backend endpoint /api/admin/users/send-email may not be implemented yet.');
      }
      throw error;
    }
  }
}

export const emailService = new EmailService();

