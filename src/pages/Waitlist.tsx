import { useState, useEffect, useRef } from 'react';
import { Search, Mail, Send, CheckSquare, Square, FileText, Eye, Edit } from 'lucide-react';
import { Card, Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { waitlistService } from '../services/api/waitlist.service';
import { emailService } from '../services/api/email.service';
import { emailTemplateService } from '../services/api/email-template.service';
import type { WaitlistUser } from '../types/waitlist.types';
import type { SendEmailDto } from '../types/email.types';
import type { EmailTemplate } from '../types/email-template.types';
import { formatDate } from '../utils/formatters';

export function Waitlist() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', htmlBody: '' });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [emailViewMode, setEmailViewMode] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadWaitlistUsers();
  }, []);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadWaitlistUsers();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadWaitlistUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await waitlistService.getWaitlistUsers({
        search: searchTerm || undefined,
        limit: 100,
      });
      setUsers(response.users || []);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load waitlist users';
      setError(errorMessage);
      console.error('Failed to load waitlist users:', err);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const loadEmailTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const templates = await emailTemplateService.getTemplates({ isActive: true });
      // Ensure templates is always an array
      setEmailTemplates(Array.isArray(templates) ? templates : []);
    } catch (err) {
      console.error('Failed to load email templates:', err);
      setEmailTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleOpenEmailModal = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user to send an email to.');
      return;
    }
    setIsEmailModalOpen(true);
    setEmailForm({ subject: '', body: '', htmlBody: '' });
    setSelectedTemplateId('');
    await loadEmailTemplates();
  };

  const handleTemplateSelect = (templateId: number | '') => {
    setSelectedTemplateId(templateId);
    
    if (templateId === '') {
      setEmailForm({ subject: '', body: '', htmlBody: '' });
      return;
    }

    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      const hasHtmlContent = !!(template.htmlContent || template.bodyHtml);
      setEmailForm({
        subject: template.subject || '',
        body: hasHtmlContent ? '' : (template.textContent || template.body || ''),
        htmlBody: hasHtmlContent ? (template.htmlContent || template.bodyHtml || '') : '',
      });
    }
  };

  const handleSendEmail = async () => {
    const hasTextBody = emailForm.body.trim().length > 0;
    const hasHtmlBody = emailForm.htmlBody.trim().length > 0;
    
    if (!emailForm.subject.trim()) {
      alert('Please fill in the subject.');
      return;
    }
    
    if (hasHtmlTemplate && !hasHtmlBody) {
      alert('Please fill in the HTML body.');
      return;
    }
    
    if (!hasHtmlTemplate && !hasTextBody) {
      alert('Please fill in the text body.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setError(null);
      const selectedEmails = Array.from(selectedUsers)
        .map((id) => users.find((u) => u.id === id)?.email)
        .filter((email): email is string => !!email);

      // Send to multiple recipients using the general email service
      const emailData: SendEmailDto = {
        email: selectedEmails.length === 1 ? selectedEmails[0] : selectedEmails,
        subject: emailForm.subject,
        text: emailForm.body.trim() || undefined,
        html: emailForm.htmlBody.trim() || undefined,
      };

      const response = await emailService.sendEmail(emailData);
      
      if (response && response.success) {
        const recipientCount = response.recipientCount || response.sentCount || selectedEmails.length;
        alert(
          `Email sent successfully!\nRecipients: ${recipientCount}${
            response.failedCount && response.failedCount > 0
              ? `\nFailed: ${response.failedCount}`
              : ''
          }${
            response.failedEmails && response.failedEmails.length > 0
              ? `\nFailed emails: ${response.failedEmails.join(', ')}`
              : ''
          }`
        );
        setIsEmailModalOpen(false);
        setEmailForm({ subject: '', body: '', htmlBody: '' });
        setSelectedTemplateId('');
        setEmailViewMode('edit');
        setSelectedUsers(new Set());
      } else {
        alert(`Failed to send email: ${response?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to send email';
      
      // Handle 404 - endpoint might not exist yet
      if (err?.response?.status === 404) {
        errorMessage = 'Email sending endpoint not available. The backend endpoint /api/admin/users/send-email may not be implemented yet.';
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Failed to send email:', err);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const selectedCount = selectedUsers.size;
  const allSelected = users.length > 0 && selectedUsers.size === users.length;
  
  // Determine if selected template has HTML content
  const selectedTemplate = selectedTemplateId 
    ? emailTemplates.find((t) => t.id === selectedTemplateId)
    : null;
  const hasHtmlTemplate = selectedTemplate 
    ? !!(selectedTemplate.htmlContent || selectedTemplate.bodyHtml)
    : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waitlist Management</h1>
          <p className="text-gray-600 mt-1">Manage waitlist users and send them emails</p>
        </div>
        <Button
          onClick={handleOpenEmailModal}
          disabled={selectedCount === 0}
          title={selectedCount === 0 ? 'Select users to send email' : `Send email to ${selectedCount} user(s)`}
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Email ({selectedCount})
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </div>
        </div>

        <Table isLoading={isLoading} emptyMessage="No waitlist users found">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button
                  onClick={handleSelectAll}
                  className="p-1 hover:bg-gray-100 rounded"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-primary-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelected = selectedUsers.has(user.id);
              return (
                <TableRow key={user.id} className={isSelected ? 'bg-primary-50' : ''}>
                  <TableCell>
                    <button
                      onClick={() => handleSelectUser(user.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailForm({ subject: '', body: '', htmlBody: '' });
          setSelectedTemplateId('');
          setEmailViewMode('edit');
        }}
        title={`Send Email to ${selectedCount} User(s)`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Sending to: {Array.from(selectedUsers).map((id) => {
                const user = users.find((u) => u.id === id);
                return user?.email;
              }).filter(Boolean).join(', ')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Template (Optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value ? Number(e.target.value) : '')}
              disabled={isSendingEmail || isLoadingTemplates}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="">Select a template...</option>
              {Array.isArray(emailTemplates) && emailTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.category ? `(${template.category})` : ''}
                </option>
              ))}
            </select>
            {isLoadingTemplates && (
              <p className="mt-1 text-xs text-gray-500">Loading templates...</p>
            )}
            {emailTemplates.length === 0 && !isLoadingTemplates && (
              <p className="mt-1 text-xs text-gray-500">No active templates available</p>
            )}
            {selectedTemplateId && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <FileText className="w-4 h-4" />
                  <span>Template selected. You can edit the subject and body below.</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Email subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
              disabled={isSendingEmail}
            />
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setEmailViewMode('edit')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                emailViewMode === 'edit'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit className="w-4 h-4 inline mr-2" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setEmailViewMode('preview')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                emailViewMode === 'preview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Preview
            </button>
          </div>

          {emailViewMode === 'edit' ? (
            <>
              {!hasHtmlTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Body <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Email body (plain text)"
                    value={emailForm.body}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value }))}
                    disabled={isSendingEmail}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y font-mono text-sm"
                  />
                </div>
              )}

              {hasHtmlTemplate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Body <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={12}
                    placeholder="Email body (HTML)"
                    value={emailForm.htmlBody}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, htmlBody: e.target.value }))}
                    disabled={isSendingEmail}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    HTML email body is required for this template.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Preview
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                {emailForm.htmlBody ? (
                  <div className="bg-white p-4">
                    <div className="mb-2 text-xs text-gray-500">
                      <strong>Subject:</strong> {emailForm.subject || '(No subject)'}
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                    <iframe
                      srcDoc={emailForm.htmlBody}
                      title="Email Preview"
                      className="w-full border-0"
                      style={{
                        minHeight: '400px',
                        maxHeight: '600px',
                        overflow: 'auto',
                      }}
                      sandbox="allow-same-origin"
                    />
                    </div>
                  </div>
                ) : emailForm.body ? (
                  <div className="bg-white p-4">
                    <div className="mb-2 text-xs text-gray-500">
                      <strong>Subject:</strong> {emailForm.subject || '(No subject)'}
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900">
                        {emailForm.body}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No email content to preview.</p>
                    <p className="text-xs mt-2">Add text or HTML body to see preview.</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This preview shows how the email will appear to recipients. HTML styles are rendered.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEmailModalOpen(false);
                setEmailForm({ subject: '', body: '', htmlBody: '' });
                setSelectedTemplateId('');
                setEmailViewMode('edit');
              }}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={
                isSendingEmail || 
                !emailForm.subject.trim() || 
                (hasHtmlTemplate ? !emailForm.htmlBody.trim() : !emailForm.body.trim())
              }
              isLoading={isSendingEmail}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

