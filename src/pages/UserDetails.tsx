import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui';
import { usersService } from '../services/api/users.service';
import { emailService } from '../services/api/email.service';
import { emailTemplateService } from '../services/api/email-template.service';
import type { SendEmailDto } from '../types/email.types';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';
import { ArrowLeft, Award, Smartphone, Bell, CreditCard, Wallet, TrendingUp, Target, Calendar, FileText, Gamepad2, Mail, Send, Eye, Edit } from 'lucide-react';
import type { PushNotificationLog } from '../types/push-notification.types';
import type { UserDetailsResponse } from '../types/user.types';
import type { EmailTemplate } from '../types/email-template.types';

type TabType = 'profile' | 'devices' | 'notifications' | 'push-logs' | 'badges' | 'integrations' | 'financial-accounts' | 'credit-cards' | 'transactions' | 'budgets' | 'savings-goals' | 'reminders' | 'notes' | 'gamification';

export function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', htmlBody: '' });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [emailViewMode, setEmailViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (userId) {
      loadUserDetails();
    }
  }, [userId]);

  const loadUserDetails = async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await usersService.getUserDetails(Number(userId));
      setUserDetails(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load user details';
      setError(errorMessage);
      console.error('Failed to load user details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const templates = await emailTemplateService.getTemplates({ isActive: true });
      setEmailTemplates(Array.isArray(templates) ? templates : []);
    } catch (err) {
      console.error('Failed to load email templates:', err);
      setEmailTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleOpenEmailModal = async () => {
    if (!userDetails?.user?.email) {
      alert('User email not available.');
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

    if (!userDetails?.user?.email) {
      alert('User email not available.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setError(null);
      
      const emailData: SendEmailDto = {
        email: userDetails.user.email,
        subject: emailForm.subject,
        text: emailForm.body.trim() || undefined,
        html: emailForm.htmlBody.trim() || undefined,
      };

      const response = await emailService.sendEmail(emailData);
      
      if (response && response.success) {
        const recipientCount = response.recipientCount || response.sentCount || 1;
        alert(
          `Email sent successfully!\nRecipient: ${userDetails.user.email}${
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
      } else {
        alert(`Failed to send email: ${response?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to send email';
      
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

  // Determine if selected template has HTML content
  const selectedTemplate = selectedTemplateId 
    ? emailTemplates.find((t) => t.id === selectedTemplateId)
    : null;
  const hasHtmlTemplate = selectedTemplate 
    ? !!(selectedTemplate.htmlContent || selectedTemplate.bodyHtml)
    : false;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
        <Card>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user details...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-red-600">{error || 'User not found'}</p>
            <Button onClick={() => navigate('/users')} className="mt-4">
              Return to Users
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile', icon: null },
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'push-logs', label: 'Push Logs', icon: Bell },
    { id: 'badges', label: 'Badges', icon: Award },
    { id: 'integrations', label: 'Integrations', icon: null },
    { id: 'financial-accounts', label: 'Financial Accounts', icon: Wallet },
    { id: 'credit-cards', label: 'Credit Cards', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: TrendingUp },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'savings-goals', label: 'Savings Goals', icon: Target },
    { id: 'reminders', label: 'Reminders', icon: Calendar },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'gamification', label: 'Gamification', icon: Gamepad2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/users')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Details: {userDetails.user?.email || 'Unknown'}
            </h1>
            <p className="text-gray-600 mt-1">User ID: {userDetails.user?.id}</p>
          </div>
        </div>
        {userDetails.user?.email && (
          <Button onClick={handleOpenEmailModal}>
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card>
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{userDetails.user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">User ID</label>
                <p className="text-gray-900">{userDetails.user?.id || 'N/A'}</p>
              </div>
              {userDetails.profile && (
                <>
                  {userDetails.profile.fullName && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-gray-900">{userDetails.profile.fullName}</p>
                    </div>
                  )}
                  {userDetails.profile.type && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Profile Type</label>
                      <p className="text-gray-900">{userDetails.profile.type}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <Table isLoading={false} emptyMessage="No devices found">
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Registered At</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.devices?.map((device: any) => (
                  <TableRow key={device.id || device.deviceId}>
                    <TableCell className="font-mono text-xs">{device.id || device.deviceId}</TableCell>
                    <TableCell>{device.deviceName || 'Unknown'}</TableCell>
                    <TableCell>{device.platform || 'N/A'}</TableCell>
                    <TableCell>{device.registeredAt ? formatDateTime(device.registeredAt) : 'N/A'}</TableCell>
                    <TableCell>{device.lastActiveAt ? formatDateTime(device.lastActiveAt) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.notifications?.count || 0} notification(s)
            </div>
            <Table isLoading={false} emptyMessage="No notifications found">
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Read</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.notifications?.items?.map((notification: any) => (
                  <TableRow key={notification.id}>
                    <TableCell>{notification.type || 'N/A'}</TableCell>
                    <TableCell>{notification.title || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{notification.message || 'N/A'}</TableCell>
                    <TableCell>{notification.sentAt ? formatDateTime(notification.sentAt) : 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        notification.isRead ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {notification.isRead ? 'Read' : 'Unread'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'push-logs' && (
          <div>
            {userDetails.pushNotifications?.statistics && (
              <div className="mb-6 grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-blue-700">{userDetails.pushNotifications.statistics.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Delivered</div>
                  <div className="text-2xl font-bold text-green-700">{userDetails.pushNotifications.statistics.delivered}</div>
                  <div className="text-xs text-gray-600 mt-1">{userDetails.pushNotifications.statistics.deliveryRate.toFixed(1)}% rate</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Failed</div>
                  <div className="text-2xl font-bold text-red-700">{userDetails.pushNotifications.statistics.failed}</div>
                  <div className="text-xs text-gray-600 mt-1">{userDetails.pushNotifications.statistics.failureRate.toFixed(1)}% rate</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Pending</div>
                  <div className="text-2xl font-bold text-yellow-700">{userDetails.pushNotifications.statistics.pending}</div>
                </div>
              </div>
            )}
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.pushNotifications?.count || 0} push notification log(s)
            </div>
            <Table isLoading={false} emptyMessage="No push notification logs found">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Delivered At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.pushNotifications?.logs?.map((log: PushNotificationLog) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.body}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        log.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        log.status === 'failed' || log.status === 'error' ? 'bg-red-100 text-red-700' :
                        log.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.status}
                      </span>
                    </TableCell>
                    <TableCell>{log.deviceName || log.deviceId || 'N/A'}</TableCell>
                    <TableCell>{log.sentAt ? formatDateTime(log.sentAt) : 'N/A'}</TableCell>
                    <TableCell>{log.deliveredAt ? formatDateTime(log.deliveredAt) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'badges' && (
          <div>
            {userDetails.badges?.streaks && (
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Current Streak</div>
                  <div className="text-2xl font-bold text-purple-700">{userDetails.badges.streaks.current || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Longest Streak</div>
                  <div className="text-2xl font-bold text-purple-700">{userDetails.badges.streaks.longest || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total Badges</div>
                  <div className="text-2xl font-bold text-purple-700">{userDetails.badges.badges?.length || 0}</div>
                </div>
              </div>
            )}
            <Table isLoading={false} emptyMessage="No badges found">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Earned At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.badges?.badges?.map((badge: any) => (
                  <TableRow key={badge.id}>
                    <TableCell className="font-medium">{badge.name || badge.key}</TableCell>
                    <TableCell>{badge.description || 'N/A'}</TableCell>
                    <TableCell>{badge.category || 'N/A'}</TableCell>
                    <TableCell>{badge.earnedAt ? formatDateTime(badge.earnedAt) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div>
            <Table isLoading={false} emptyMessage="No integrations found">
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Reauth Needed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.integrations?.map((integration: any) => (
                  <TableRow key={integration.id}>
                    <TableCell>{integration.type || 'N/A'}</TableCell>
                    <TableCell>{integration.provider || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        integration.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {integration.status || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>{integration.lastSync ? formatDateTime(integration.lastSync) : 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        integration.reauthNeeded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {integration.reauthNeeded ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'financial-accounts' && (
          <div>
            <Table isLoading={false} emptyMessage="No financial accounts found">
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.financialAccounts?.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.accountName || 'N/A'}</TableCell>
                    <TableCell>{account.accountType || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(account.balance, account.currency)}</TableCell>
                    <TableCell>{account.currency || 'N/A'}</TableCell>
                    <TableCell>{account.lastUpdated ? formatDateTime(account.lastUpdated) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'credit-cards' && (
          <div>
            <Table isLoading={false} emptyMessage="No credit cards found">
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Card Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Payment Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.creditCards?.map((card: any) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.accountName || 'N/A'}</TableCell>
                    <TableCell>{card.cardType || 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(card.currentBalance)}</TableCell>
                    <TableCell>{formatCurrency(card.creditLimit)}</TableCell>
                    <TableCell>{card.utilizationRate ? `${card.utilizationRate.toFixed(1)}%` : 'N/A'}</TableCell>
                    <TableCell>
                      {card.paymentDueDate ? formatDate(card.paymentDueDate) : 'N/A'}
                      {card.isPastDue && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Past Due</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.transactions?.count || 0} transaction(s)
            </div>
            <Table isLoading={false} emptyMessage="No transactions found">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.transactions?.items?.map((transaction: any) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date ? formatDate(transaction.date) : 'N/A'}</TableCell>
                    <TableCell>{transaction.description || 'N/A'}</TableCell>
                    <TableCell>{transaction.merchant || 'N/A'}</TableCell>
                    <TableCell className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{transaction.category?.name || 'N/A'}</TableCell>
                    <TableCell>{transaction.type || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'budgets' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.budgets?.count || 0} budget(s)
            </div>
            <Table isLoading={false} emptyMessage="No budgets found">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Spent</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.budgets?.items?.map((budget: any) => {
                  const remaining = (budget.amount || 0) - (budget.spent || 0);
                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.name || 'N/A'}</TableCell>
                      <TableCell>{budget.category?.name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(budget.amount, budget.currency)}</TableCell>
                      <TableCell>{formatCurrency(budget.spent, budget.currency)}</TableCell>
                      <TableCell className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(remaining, budget.currency)}
                      </TableCell>
                      <TableCell>{budget.period || 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'savings-goals' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.savingsGoals?.count || 0} savings goal(s)
            </div>
            <Table isLoading={false} emptyMessage="No savings goals found">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target Amount</TableHead>
                  <TableHead>Current Amount</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.savingsGoals?.items?.map((goal: any) => {
                  const progress = goal.targetAmount > 0 
                    ? ((goal.currentAmount || 0) / goal.targetAmount) * 100 
                    : 0;
                  return (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(goal.targetAmount, goal.currency)}</TableCell>
                      <TableCell>{formatCurrency(goal.currentAmount, goal.currency)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{goal.deadline ? formatDate(goal.deadline) : 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded ${
                          goal.isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {goal.isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'reminders' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.reminders?.count || 0} reminder(s)
            </div>
            <Table isLoading={false} emptyMessage="No reminders found">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reminder Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.reminders?.items?.map((reminder: any) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">{reminder.title || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate">{reminder.description || 'N/A'}</TableCell>
                    <TableCell>{reminder.reminderDate ? formatDateTime(reminder.reminderDate) : 'N/A'}</TableCell>
                    <TableCell>{reminder.reminderType || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded ${
                        reminder.status === 'completed' ? 'bg-green-100 text-green-700' :
                        reminder.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {reminder.status || 'N/A'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {userDetails.notes?.count || 0} note(s)
            </div>
            <Table isLoading={false} emptyMessage="No notes found">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userDetails.notes?.items?.map((note: any) => (
                  <TableRow key={note.id}>
                    <TableCell className="font-medium">{note.title || 'N/A'}</TableCell>
                    <TableCell>{note.createdAt ? formatDateTime(note.createdAt) : 'N/A'}</TableCell>
                    <TableCell>{note.updatedAt ? formatDateTime(note.updatedAt) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'gamification' && (
          <div className="space-y-6">
            {userDetails.gamification?.progress && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total XP</div>
                  <div className="text-2xl font-bold text-purple-700">{userDetails.gamification.progress.totalXp || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Level</div>
                  <div className="text-2xl font-bold text-purple-700">{userDetails.gamification.progress.level || 0}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Completion</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {userDetails.gamification.progress.completionPercent != null 
                      ? Number(userDetails.gamification.progress.completionPercent).toFixed(1) 
                      : '0.0'}%
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Quests Completed</div>
                  <div className="text-2xl font-bold text-purple-700">
                    {userDetails.gamification.quests?.filter((q: any) => q.status === 'completed').length || 0}
                  </div>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quests</h3>
              <Table isLoading={false} emptyMessage="No quests found">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userDetails.gamification?.quests?.map((userQuest: any) => (
                    <TableRow key={userQuest.id}>
                      <TableCell className="font-medium">{userQuest.quest?.title || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded ${
                          userQuest.status === 'completed' ? 'bg-green-100 text-green-700' :
                          userQuest.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {userQuest.status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {userQuest.progress ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(userQuest.progress.percent || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {userQuest.progress.current}/{userQuest.progress.target}
                            </span>
                          </div>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{userQuest.quest?.xp || 0}</TableCell>
                      <TableCell>{userQuest.startedAt ? formatDateTime(userQuest.startedAt) : 'N/A'}</TableCell>
                      <TableCell>{userQuest.completedAt ? formatDateTime(userQuest.completedAt) : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
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
        title={`Send Email to ${userDetails.user?.email || 'User'}`}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Sending to: {userDetails.user?.email}
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

