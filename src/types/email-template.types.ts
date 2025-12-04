export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  textContent?: string; // Plain text email body
  htmlContent?: string; // HTML email body
  body?: string; // Legacy alias for textContent
  bodyHtml?: string; // Legacy alias for htmlContent
  variables?: string[] | Record<string, string>; // Array of variable names or object with variable descriptions
  type?: string; // Template type (e.g., 'welcome', 'transaction', etc.)
  category?: string; // e.g., 'notification', 'transaction', 'reminder', 'transactional', etc.
  description?: string; // Template description
  fromEmail?: string | null; // From email address
  fromName?: string | null; // From name
  replyTo?: string | null; // Reply-to email address
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplatesResponse {
  success: boolean;
  templates: EmailTemplate[];
  count: number;
}

export interface CreateEmailTemplateDto {
  name: string;
  subject: string;
  textContent?: string; // Plain text email body
  htmlContent?: string; // HTML email body
  body?: string; // Legacy alias for textContent (for backward compatibility)
  bodyHtml?: string; // Legacy alias for htmlContent (for backward compatibility)
  variables?: string[];
  category?: string;
  isActive?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  subject?: string;
  textContent?: string; // Plain text email body
  htmlContent?: string; // HTML email body
  body?: string; // Legacy alias for textContent (for backward compatibility)
  bodyHtml?: string; // Legacy alias for htmlContent (for backward compatibility)
  variables?: string[];
  category?: string;
  isActive?: boolean;
}

export interface EmailTemplateQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}

