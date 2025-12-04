export type FeedbackStatus = 'open' | 'triaged' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackAttachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'url' | 'text';
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface Feedback {
  id: number;
  subject: string;
  message: string;
  status: FeedbackStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  userId?: number | null;
  userEmail?: string | null;
  attachments?: FeedbackAttachment[];
}

export interface FeedbackQueryParams {
  status?: FeedbackStatus;
  page?: number;
  limit?: number;
  search?: string;
}

export interface FeedbackMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FeedbackResponse {
  items: Feedback[];
  meta: FeedbackMeta;
}

