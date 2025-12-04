export interface SendEmailDto {
  email: string | string[]; // Single email or array of emails
  subject: string;
  text?: string; // Plain text email body
  html?: string; // HTML email body
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  failedEmails?: string[];
  recipientCount?: number;
}

