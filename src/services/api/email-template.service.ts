import { apiClient } from '../apiClient';
import type {
  EmailTemplate,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryParams,
  EmailTemplatesResponse,
} from '../../types/email-template.types';

class EmailTemplateService {
  async getTemplates(params?: EmailTemplateQueryParams): Promise<EmailTemplate[]> {
    const response = await apiClient.getClient().get<EmailTemplatesResponse | EmailTemplate[]>('/api/admin/email-templates', { params });
    
    // Handle both response formats: wrapped { success, templates, count } or direct array
    if (response.data && typeof response.data === 'object' && 'templates' in response.data) {
      const wrappedResponse = response.data as EmailTemplatesResponse;
      return wrappedResponse.templates || [];
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  }

  async getTemplateById(id: number): Promise<EmailTemplate> {
    const response = await apiClient.getClient().get<EmailTemplate>(`/api/admin/email-templates/${id}`);
    return response.data;
  }

  async createTemplate(data: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const response = await apiClient.getClient().post<EmailTemplate>('/api/admin/email-templates', data);
    return response.data;
  }

  async updateTemplate(id: number, data: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const response = await apiClient.getClient().put<EmailTemplate>(`/api/admin/email-templates/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: number): Promise<void> {
    await apiClient.getClient().delete(`/api/admin/email-templates/${id}`);
  }
}

export const emailTemplateService = new EmailTemplateService();

