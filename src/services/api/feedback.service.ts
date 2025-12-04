import { apiClient } from '../apiClient';
import type { FeedbackQueryParams, FeedbackResponse } from '../../types/feedback.types';

class FeedbackService {
  async getFeedbacks(params?: FeedbackQueryParams): Promise<FeedbackResponse> {
    const response = await apiClient.getClient().get<FeedbackResponse>(
      '/api/admin/feedbacks',
      { params }
    );
    return response.data;
  }
}

export const feedbackService = new FeedbackService();

