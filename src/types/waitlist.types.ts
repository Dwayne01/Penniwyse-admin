export interface WaitlistUser {
  id: string; // Firebase document ID
  email: string;
  name?: string;
  createdAt: string | Date;
  metadata?: Record<string, unknown>;
}

export interface WaitlistQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface WaitlistResponse {
  users: WaitlistUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface SendEmailDto {
  email: string; // Single email address (must be a valid email)
  subject: string;
  text?: string; // Plain text email body
  html?: string; // HTML email body
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  failedEmails?: string[];
}

